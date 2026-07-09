# ⚔️ Lennyx

**La to-do list gamifiée.** Transforme tes tâches en quêtes, gagne de l'XP, monte en rang de
🌱 Newcomer jusqu'à 🏆 TaskMaster (niveau 100), entretiens tes streaks 🔥 et débloque des
récompenses.

100 % gratuit, 100 % local : tes données ne quittent jamais ton appareil.

## 📱 Installer Lennyx sur ton téléphone

**Option A — L'APK (recommandé)**
1. Récupère `Lennyx-0.3.0.apk` (dossier `release/` si compilé en local, ou artefact
   *Lennyx-Android* de GitHub Actions après un push).
2. Envoie-le sur ton téléphone (câble USB, ou Réglages → Synchronisation… ou n'importe quoi).
3. Ouvre le fichier sur le téléphone → Android demande d'autoriser « l'installation
   d'applications inconnues » pour ton gestionnaire de fichiers → accepte → Installer.
4. Au premier lancement, **autorise les notifications** quand Lennyx le demande : c'est ce qui
   permet aux rappels de sonner même application fermée.

**Option B — La version web installable (PWA)**
1. Pousse le projet sur GitHub, active Pages (Settings → Pages → Source : *GitHub Actions*).
2. Sur le téléphone, ouvre `https://<ton-pseudo>.github.io/lennyx/` dans Chrome.
3. Menu ⋮ → **« Ajouter à l'écran d'accueil »** → Lennyx s'installe comme une vraie app,
   fonctionne hors-ligne après le premier chargement.
   (Limites PWA : notifications seulement app ouverte, pas de sync réseau local depuis https.)

**Synchroniser PC ↔ téléphone** : sur le PC (app installée), Réglages → Synchronisation →
« Démarrer la session » ; sur le téléphone, saisis l'adresse et le code affichés (même Wi-Fi).
Tu choisis le sens : récupérer la sauvegarde du PC, ou envoyer celle du téléphone.

## ✨ Fonctionnalités (v0.2)

- **Quêtes** avec sous-quêtes, difficulté (facile → épique), échéance, rubrique, et
  **événements spéciaux** à récompense doublée
- **Quêtes quotidiennes** programmables par jour, **streak individuel**, bonus de record,
  pénalité d'XP en cas d'oubli — et **tâches chronométrées** (« arriver avant 8h00 » :
  +25 % de ponctualité à l'heure, récompense réduite et streak brisé en retard)
- **Bibliothèque** : ~120 modèles de tâches en 12 rubriques (travail, études, hygiène, sport,
  nutrition, maison, finances, social, esprit, créativité, tech, sommeil) à ajouter en un clic
- **L'Oracle** : agent intégré 100 % hors-ligne — conversation en français, création de tâches
  en langage naturel, bilan hebdomadaire, briefing quotidien, sentinelle du soir,
  « génère ma journée »
- **XP et niveaux v2** : ~152 000 XP jusqu'au niveau 100 — des mois d'assiduité réelle, une
  progression de plus en plus exigeante, 14 rangs
- **Combos**, **streak global**, or, **69 succès**
- **Boutique somptueuse** : 19 thèmes complets, 18 sigils héraldiques, 26 titres à porter,
  effets ambiants et effets de complétion — certains réservés aux hauts niveaux
- **Effets visuels** : fond animé (poussière d'étoiles, aurore, braises, pluie de code…),
  particules à chaque tâche accomplie, level-up avec confettis et liste des déblocages
- **Design** : monogramme « L » or, typographie Cinzel/Manrope, obsidienne & or, zéro emoji
- **Statistiques** : graphe d'XP 14 jours, ponctualité, journées parfaites, rubriques favorites
- **Sons synthétisés** (zéro fichier audio) et animations désactivables
- **Export / import de sauvegarde** JSON pour transférer entre PC et téléphone

## 🔔 Nouveautés v0.3

- **Notifications** (pilier de l'app) : rappels de tâches chronométrées (5 min à 1 h avant,
  réglable), ultime rappel à l'heure limite, briefing du matin, sentinelle du soir,
  célébrations — chaque type a sa sonorité. Sur **Android, elles sonnent même app fermée**
  (programmation native) ; sur PC, tant que Lennyx est ouvert.
- **Bande sonore générative** : musique d'ambiance infinie composée en direct (nappes,
  réverbération, mélodies pentatoniques), 3 ambiances — Éther, Bravoure, Focus — avec volumes
  séparés effets/musique.
- **Sons v2** : moteur de synthèse enrichi (FM, couches, percussions de bruit) — complétion,
  record, journée parfaite, fanfare de niveau, tintement d'or, nappe de l'Oracle…
- **Sync PC ↔ téléphone en réseau local** : le PC héberge une session (QR + code), le téléphone
  tire ou pousse sa sauvegarde. Aucun serveur, aucune donnée ne quitte ton Wi-Fi.
- **PWA** : la version web s'installe sur téléphone et fonctionne hors-ligne.

## 🛠️ Stack

| Couche | Techno |
|---|---|
| UI | React 18 + TypeScript + Vite |
| État | Zustand (persisté en local) |
| Windows (.exe) | Electron + electron-builder |
| Android (.apk) | Capacitor |
| CI | GitHub Actions (build .exe + .apk gratuits) |

## 🚀 Développement

```bash
npm install
npm run dev          # dev server sur http://localhost:5173
```

## 📦 Builds

### Windows (.exe) — en local

```bash
npm run electron:build
# → release/Lennyx Setup 0.1.0.exe
```

### Android (.apk) — via GitHub Actions (gratuit, sans Android Studio)

1. Crée un dépôt GitHub et pousse le projet :
   ```bash
   git init && git add -A && git commit -m "Lennyx v0.1"
   git remote add origin https://github.com/<toi>/lennyx.git
   git push -u origin main
   ```
2. Sur GitHub → onglet **Actions** → le workflow *Build Lennyx* se lance tout seul.
3. Télécharge l'artefact **Lennyx-Android** → `app-debug.apk` → installe-le sur ton téléphone
   (autorise les « sources inconnues »).

> Le build local de l'APK est aussi possible si tu installes JDK 21 + Android SDK, puis :
> `npm run android:sync && cd android && gradlew assembleDebug`

## 🗺️ Roadmap

- [x] **v0.2** — Bibliothèque de tâches, tâches chronométrées, Oracle, refonte visuelle,
  rééquilibrage XP, catalogue étendu (thèmes, sigils, titres, effets)
- [ ] **v0.3** — Sync PC ↔ téléphone par QR code **en réseau local** (aucun serveur, gratuit),
  notifications locales de rappel
- [ ] **v0.4** — Social : amis, défis, classements (nécessite un backend — free tier
  Supabase/Firebase quand le budget/l'envie sera là) ; Oracle branché sur un vrai LLM en
  option (clé API fournie par l'utilisateur)
- [ ] **v1.0** — Boss de la semaine, saisons, quêtes d'histoire

## 💰 Monétisation

Volontairement **aucune** pour l'instant : Lennyx est une app personnelle et locale. Les tiers
« premium » (cosmétiques exclusifs, cloud sync) sont notés dans la roadmap et ne seront
envisagés que si un backend voit le jour. Tout ce qui existe aujourd'hui restera gratuit.
