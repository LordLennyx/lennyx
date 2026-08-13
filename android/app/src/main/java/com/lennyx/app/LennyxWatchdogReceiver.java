package com.lennyx.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

/**
 * Chien de garde de la présence permanente.
 *
 * Un service de premier plan n'est pas éternel : sous pression mémoire, quand
 * l'utilisateur balaie l'application hors des récentes, ou — surtout — sur les
 * surcouches constructeur agressives (One UI met les applications « en veille »
 * de sa propre initiative), Android le tue sans prévenir. Le compteur reste
 * alors figé jusqu'à la prochaine ouverture de l'application, ce qui est
 * exactement le symptôme « ça ne compte plus dès que je ferme ».
 *
 * On programme donc un réveil exact toutes les quinze minutes qui vérifie que
 * le service tourne encore et le relance sinon. Le passage par une alarme
 * exacte n'est pas un détail : c'est l'une des rares dérogations qui autorise
 * à démarrer un service de premier plan depuis l'arrière-plan (Android 12+).
 */
public class LennyxWatchdogReceiver extends BroadcastReceiver {

    private static final int REQUEST = 7311;
    private static final long INTERVAL_MS = 15 * 60_000L;

    /** (Re)programme la prochaine vérification. Sans effet si la présence est coupée. */
    public static void schedule(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(LennyxStepService.PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(LennyxStepService.KEY_ENABLED, false)) return;

        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        long at = System.currentTimeMillis() + INTERVAL_MS;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // …AndAllowWhileIdle : traverse le mode Doze, sinon le réveil
                // serait repoussé de plusieurs heures la nuit — le moment où le
                // téléphone dort le plus, donc où le chien de garde sert le plus.
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending(ctx));
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, at, pending(ctx));
            }
        } catch (SecurityException ignored) {
            // Permission d'alarme exacte révoquée : on se rabat sur un réveil
            // approximatif, moins ponctuel mais toujours utile.
            try {
                am.set(AlarmManager.RTC_WAKEUP, at, pending(ctx));
            } catch (Exception ignored2) { }
        }
    }

    public static void cancel(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(pending(ctx));
    }

    private static PendingIntent pending(Context ctx) {
        Intent i = new Intent(ctx, LennyxWatchdogReceiver.class);
        return PendingIntent.getBroadcast(
            ctx, REQUEST, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        SharedPreferences prefs = ctx.getSharedPreferences(LennyxStepService.PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(LennyxStepService.KEY_ENABLED, false)) return;

        // Depuis Android 14, démarrer un service « health » sans cette permission
        // lève une exception fatale : on préfère ne rien faire.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            && ctx.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        try {
            Intent svc = new Intent(ctx, LennyxStepService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(svc);
            } else {
                ctx.startService(svc);
            }
        } catch (Exception ignored) {
            // service déjà lancé, ou démarrage refusé : la prochaine passe réessaiera
        }

        // Une alarme exacte ne se répète pas d'elle-même : on rearme la suivante.
        schedule(ctx);
    }
}
