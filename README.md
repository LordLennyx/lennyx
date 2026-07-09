# ⚔️ Lennyx

**La to-do list gamifiée.** Transforme tes tâches en quêtes, gagne de l'XP, monte en rang de
🌱 Newcomer jusqu'à 🏆 TaskMaster (niveau 100), entretiens tes streaks 🔥 et débloque des
récompenses.

100 % gratuit, 100 % local : tes données ne quittent jamais ton appareil.

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
