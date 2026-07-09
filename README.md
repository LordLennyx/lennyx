# ⚔️ Lennyx

**La to-do list gamifiée.** Transforme tes tâches en quêtes, gagne de l'XP, monte en rang de
🌱 Newcomer jusqu'à 🏆 TaskMaster (niveau 100), entretiens tes streaks 🔥 et débloque des
récompenses.

100 % gratuit, 100 % local : tes données ne quittent jamais ton appareil.

## ✨ Fonctionnalités (v0.1)

- **Quêtes** avec sous-quêtes (étapes), difficulté (facile → épique), échéance, et
  **événements spéciaux** à récompense doublée 🌟
- **Quêtes quotidiennes** programmables par jour de la semaine, avec **streak individuel**,
  bonus de record 📈 et pénalité d'XP en cas d'oubli 😬
- **XP et niveaux** : courbe de 25 000 XP jusqu'au niveau 100, 14 rangs, récompenses qui
  augmentent avec ton niveau
- **Combos** : chaque tâche accomplie le même jour augmente le multiplicateur ⚡
- **Streak global** : jours consécutifs d'activité 🔥
- **27 succès** à débloquer, chacun rapportant de l'or 🪙
- **Boutique** : avatars et thèmes de couleurs à acheter avec l'or gagné 🛍️
- **Statistiques** : graphe d'XP sur 14 jours, records, échelle des rangs
- **Sons rétro synthétisés** (zéro fichier audio), désactivables
- **Export / import de sauvegarde** en JSON pour transférer entre PC et téléphone
- Interface **desktop + mobile**, thème sombre gamer 🎮

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

- [ ] **v0.2** — Catégories de quêtes, filtres, recherche, notifications locales de rappel
- [ ] **v0.3** — Sync PC ↔ téléphone par QR code **en réseau local** (aucun serveur, gratuit)
- [ ] **v0.4** — Social : amis, défis, classements (nécessite un backend — free tier
  Supabase/Firebase quand le budget/l'envie sera là)
- [ ] **v1.0** — Boss de la semaine, saisons, quêtes d'histoire

## 💰 Monétisation

Volontairement **aucune** pour l'instant : Lennyx est une app personnelle et locale. Les tiers
« premium » (cosmétiques exclusifs, cloud sync) sont notés dans la roadmap et ne seront
envisagés que si un backend voit le jour. Tout ce qui existe aujourd'hui restera gratuit.
