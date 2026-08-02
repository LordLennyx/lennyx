# ⚔️ Lennyx

**La to-do list gamifiée.** Transforme tes tâches en quêtes, gagne de l'XP, monte en rang de
🌱 Newcomer jusqu'à 🏆 TaskMaster (niveau 100), entretiens tes streaks 🔥 et débloque des
récompenses.

100 % gratuit, 100 % local : tes données ne quittent jamais ton appareil.

## 📱 Installer Lennyx sur ton téléphone

**Option A — L'APK (recommandé)**
1. Récupère `Lennyx-0.6.0.apk` (dossier `release/` si compilé en local, ou artefact
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

## 🔮 Nouveautés v0.4

- **Oracle v2** : moteur d'analyse sur toutes tes données — pose-lui « ai-je une chance
  d'arriver au travail avant 8h ? » et il répond avec ton taux de réussite historique, ta
  tendance sur 7 occurrences, ton heure moyenne de validation, ton réveil moyen et tes temps
  chronométrés. **Programmes à thème** (« journée sportive et créative »), FAQ complète sur le
  jeu, défis surprises, et **voix** : l'Oracle lit ses réponses (synthèse vocale native
  Android / voix Windows, choix de la voix, débit et tonalité réglables).
- **Module Outils** : **Chronomètre** (sessions nommées ou liées à une tâche, moyennes,
  records, XP pour les sessions ≥ 10 min), **Alarmes** (réveil + berceuse, 9 mélodies
  synthétisées + import de ton propre fichier audio, journal de réveil), **Podomètre**
  (capteur de mouvement, objectif réglable, records, ajout manuel).
- **Notifications ++** : intensité **Discret / Normal / Duolingo 😈** — le mode Duolingo
  ajoute relance de midi, culpabilisation d'après-midi et double sentinelle, avec des dizaines
  de messages variés.
- **Logo Android** : le monogramme « L » orne enfin l'icône de l'application mobile.
- **Bibliothèque XXL** : 18 rubriques (+ Relation amoureuse, Spiritualité, Animaux,
  Sorties & Aventure, Administratif, Style & Image), ~200 modèles.
- **Catalogue étendu** : 24 thèmes, 22 sigils, 35 titres, ~90 succès — couronnés par deux
  trophées de légende : le titre **Souverain de Lennyx** (100 000 or) et le thème
  **Trône Céleste** (250 000 or).

## 🌐 Nouveautés v0.5

- **Oracle en ligne** : connecte-le gratuitement à Google Gemini (palier gratuit, aucune carte
  bancaire — clé sur aistudio.google.com/apikey) pour des réponses fluides, empathiques,
  conversationnelles. Il croise sommeil, pas, budget, notes et statistiques pour te répondre
  personnellement. **Résilience totale** : sans connexion (ou sans clé), il bascule aussitôt en
  mode local hors-ligne — l'app ne bloque jamais.
- **Module Notes & Traces de vie** : suivi des dépenses/revenus avec calcul automatique du reste
  à vivre, journal libre et résolutions, registre des victoires (consigner un accomplissement
  rapporte un peu d'XP).
- **Onboarding guidé** : questionnaire d'orientation (objectif, rythme, ton de l'Oracle) puis
  visite guidée animée de chaque rubrique, conclue par une animation « C'est parti ! ».
- **Respiration & méditation flash** : cohérence cardiaque, respiration carrée, détente 4-7-8,
  guide visuel animé, voix de l'Oracle en accompagnement, script de méditation flash.
- **Widget natif Android** (écran d'accueil, vrai `AppWidgetProvider`) et **widget flottant
  Windows** (fenêtre toujours au-dessus) affichant pas, streak et prochaine alarme.
- **Carte de partage** : génère une image aux couleurs de Lennyx (bilan hebdo ou record chrono),
  prête à partager ou télécharger — 100 % client, aucun serveur.
- **Notifications encore plus poussées** intégrées au mode Duolingo (déjà présent en v0.4).

## 🔒 v0.5.1 — corrections importantes

- **Plantage Notes/Journal/Victoires corrigé** : un piège classique de Zustand (sélecteur
  recréant un tableau à chaque rendu) provoquait une boucle infinie avec React 18 et faisait
  planter l'écran. Le module est maintenant stable et testé de bout en bout.
- **Moteur audio corrigé** : la profondeur de modulation FM était réglée bien trop haut (jusqu'à
  2,5× la fréquence porteuse), produisant des grincements métalliques. Profondeur ramenée à des
  valeurs musicales, filtrage/compression revus (limiteur doux partagé entre effets et musique).
- **Diagnostic Oracle en ligne** : la clé Gemini de l'utilisateur était valide, mais **le palier
  gratuit de Google Gemini n'est pas disponible dans l'UE, au Royaume-Uni ni en Suisse**
  (vérifié empiriquement : quota = 0 pour toute la zone). **Groq** a été ajouté comme fournisseur
  alternatif — gratuit partout, sans carte, et devient le choix par défaut.
- **Conversations Oracle compartimentées** : fini le flux unique — plusieurs conversations
  nommées automatiquement, listées, permutables et supprimables individuellement, avec
  séparateurs de date.
- **Réglages Oracle allégés** : la carte « Oracle en ligne » est redevenue discrète (elle
  attirait trop l'œil), avec un choix clair Groq/Gemini et l'avertissement régional.

## 🚀 Nouveautés v0.6

- **Sauvegarde cloud** : lie ta progression à un compte personnel gratuit (ton propre projet
  Supabase — aucune carte bancaire). Les données sont **chiffrées sur l'appareil avant l'envoi**
  (AES-GCM, mot de passe personnel jamais transmis) — même Supabase ne peut pas les lire.
  Résolution de conflit simple : confirmation avant tout écrasement.
- **Export/import chiffrés** : même moteur de chiffrement pour les sauvegardes JSON locales.
- **Mode Pomodoro** : cycles travail/pause configurables, pauses longues automatiques,
  notifications à chaque transition, XP et succès dédiés.
- **Widget Android enrichi** : niveau, rang, barre d'XP, barre de pas, streak, prochaine alarme
  et tâches restantes — le tout dans un vrai widget d'écran d'accueil.

> **Précision honnête** : un widget d'écran **verrouillé** (« lock screen ») façon Jetpack
> Glance a été évoqué en proposition — après vérification, Android ne propose plus cette
> fonctionnalité pour les apps tierces sur téléphone depuis Android 5.0 (Glance est juste une
> API moderne pour écrire des widgets d'écran d'accueil classiques, pas une nouvelle
> capacité). L'énergie a donc été mise sur un widget d'écran d'accueil bien plus complet plutôt
> que de promettre quelque chose qu'Android ne permet pas.

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
- [x] **v0.4** — Modules Outils (chrono/alarmes/podomètre), Oracle v2 (prédictions chiffrées),
  notifications à intensité réglable, logo Android, bibliothèque XXL, catalogue étendu
- [x] **v0.5** — Oracle en ligne (LLM gratuit + repli local résilient), Notes & Traces de vie,
  onboarding guidé, respiration/méditation, widgets (Android natif + flottant Windows),
  carte de partage
- [x] **v0.6** — Sauvegarde cloud chiffrée (compte perso, palier gratuit Supabase), export/import
  chiffrés, Pomodoro, widget Android enrichi, fournisseur Groq + corrections v0.5.1
- [ ] **v0.7** — Social : amis, défis, classements (nécessite un backend supplémentaire —
  même projet Supabase envisagé, à étendre)
- [ ] **v1.0** — Boss de la semaine, saisons, quêtes d'histoire

## 💰 Monétisation

Volontairement **aucune** pour l'instant : Lennyx est une app personnelle et locale. Les tiers
« premium » (cosmétiques exclusifs, cloud sync) sont notés dans la roadmap et ne seront
envisagés que si un backend voit le jour. Tout ce qui existe aujourd'hui restera gratuit.

## 👤 Auteur

**Njundiyimun Béchard Miles-Daniel** — Full-Stack Developer, IT Generalist & Security Analyst
Produit **Lennyx IT**.

## 📄 Licence

© 2026 Njundiyimun Béchard Miles-Daniel / Lennyx IT — Tous droits réservés.
Voir [`LICENSE`](LICENSE).
