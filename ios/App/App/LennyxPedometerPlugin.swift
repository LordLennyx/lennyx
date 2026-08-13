import Foundation
import Capacitor
import CoreMotion

/**
 Podomètre iOS.

 Là où Android impose un service de premier plan qui se fait tuer par les
 surcouches constructeur, iOS enregistre les pas en permanence dans son
 coprocesseur de mouvement et en garde l'historique — jusqu'à sept jours.
 Lennyx n'a donc RIEN à faire tourner en arrière-plan : il interroge
 l'historique à chaque ouverture et récupère tout ce qui a été marché entre
 deux lancements, écran éteint et application fermée comprises.

 C'est la même promesse que sur Android, obtenue plus simplement — et sans
 coût en batterie, puisque aucun processus de Lennyx ne veille.

 ⚠ `NSMotionUsageDescription` doit figurer dans Info.plist : sans lui, iOS
 refuse l'accès et l'application est rejetée à la validation.
 */
@objc(LennyxPedometerPlugin)
public class LennyxPedometerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LennyxPedometerPlugin"
    public let jsName = "LennyxPedometer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "queryDays", returnType: CAPPluginReturnPromise)
    ]

    private let pedometer = CMPedometer()

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        // Dates métier en heure LOCALE, comme partout dans Lennyx : un jour
        // calculé en UTC décalerait les compteurs pour l'utilisateur.
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve([
            "available": CMPedometer.isStepCountingAvailable(),
            "authorization": Self.authorizationLabel()
        ])
    }

    private static func authorizationLabel() -> String {
        switch CMPedometer.authorizationStatus() {
        case .authorized: return "granted"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "pending"
        @unknown default: return "unknown"
        }
    }

    /**
     Renvoie le nombre de pas par journée, sur les `days` derniers jours.

     iOS ne permet pas d'interroger plusieurs journées d'un coup : on enchaîne
     une requête par jour, et on ne résout qu'une fois toutes les réponses
     revenues — d'où le groupe de dispatch.
     */
    @objc func queryDays(_ call: CAPPluginCall) {
        guard CMPedometer.isStepCountingAvailable() else {
            call.resolve(["days": [:], "available": false])
            return
        }

        let count = min(max(call.getInt("days") ?? 7, 1), 7) // iOS ne garde que 7 jours
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: Date())

        var results: [String: Int] = [:]
        let lock = NSLock()
        let group = DispatchGroup()

        for offset in 0..<count {
            guard let dayStart = calendar.date(byAdding: .day, value: -offset, to: startOfToday) else { continue }
            // Fin de fenêtre : maintenant pour aujourd'hui, minuit sinon.
            let dayEnd = offset == 0
                ? Date()
                : (calendar.date(byAdding: .day, value: 1, to: dayStart) ?? Date())
            let key = Self.dayFormatter.string(from: dayStart)

            group.enter()
            pedometer.queryPedometerData(from: dayStart, to: dayEnd) { data, _ in
                if let steps = data?.numberOfSteps.intValue {
                    lock.lock()
                    results[key] = steps
                    lock.unlock()
                }
                group.leave()
            }
        }

        group.notify(queue: .main) {
            call.resolve(["days": results, "available": true])
        }
    }
}
