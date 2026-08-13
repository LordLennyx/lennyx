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

## 🔔 Nouveautés v0.7 — présence permanente et harcèlement millimétré

- **Lennyx vit en permanence dans le téléphone.** Un service Android de premier plan compte les
  pas avec le **capteur matériel** — écran éteint, application fermée, et il redémarre tout seul
  après un redémarrage du téléphone. Fini le podomètre qui ne comptait que l'app ouverte.
  À activer dans Outils → Pas (ou Réglages) : Android exige une notification discrète permanente
  pour autoriser ce fonctionnement, c'est le prix à payer et il est affiché honnêtement.
- **L'Oracle agit vraiment.** Il ne se contente plus de décrire : chaque tâche qu'il évoque est
  réellement créée, et une **carte verte sous sa réponse liste ce qu'il vient d'ajouter**. Le
  lecteur d'actions accepte désormais plusieurs créations d'un coup (un programme entier),
  n'importe où dans la réponse, et la consigne donnée au modèle est catégorique sur ce point.
- **Notifications au millimètre.** L'avance fixe disparaît au profit d'une **escalade calculée**
  selon la difficulté de la tâche et le temps restant : une tâche facile est rappelée à 15 et
  5 min ; une épique dès 2 h avant, puis de plus en plus serré jusqu'à la dernière minute. Le ton
  ET la sonnerie changent en route (calme → pressant → sanction → relance).
  **Sept sonneries distinctes**, synthétisées au build (aucun fichier audio importé).
  Nouveau : rappels d'**échéance des quêtes**, relances **après** l'heure limite, relances
  horaires et avertissement de 23h30 en mode *Implacable* — jusqu'à ~47 notifications par jour.
- **Interface mobile revue de fond en comble** : plus aucun champ écrasé ni invisible (le
  formulaire des finances était illisible sur Android), barre de navigation défilante, cibles
  tactiles agrandies, cases à cocher et curseurs aux couleurs du thème.

### v0.7.1 — correctif du podomètre

La v0.7.0 avait introduit une régression : **plus aucun pas n'était compté sur Android**. En
confiant le comptage au service natif, l'accéléromètre avait été coupé sur toute la plateforme —
alors que le service, lui, ne démarrait que si la présence permanente était activée à la main,
et elle était éteinte par défaut. Résultat : aucune source active.

Corrigé en trois points :
- **L'accéléromètre reprend la main** dès que le service ne compte pas réellement — présence
  coupée, permission refusée, ou téléphone dépourvu de podomètre matériel. La bascule dépend
  maintenant de l'état *réel* du service, plus de la simple plateforme.
- **Le service est relancé à chaque ouverture** (Android peut l'avoir arrêté sans redémarrage)
  et son activation est proposée dès le premier lancement, au lieu d'être enfouie dans un écran.
- **Diagnostic visible** dans Outils → Pas : capteur matériel détecté ou non, permission
  accordée ou non, service actif ou non, et la source de comptage réellement en service.

Deux risques de plantage repérés à la relecture et corrigés au passage : depuis Android 14,
démarrer un service de premier plan de type *health* sans la permission d'activité physique lève
une exception fatale — au démarrage du téléphone comme depuis l'application.

### v0.7.2 — les deux compteurs cohabitent enfin

Test sur téléphone : en mode limité, les pas montaient dans l'app mais rien en dehors ; en mode
permanent, plus rien du tout — permissions pourtant toutes accordées. Deux causes, une seule
racine : **les deux sources de comptage écrivaient dans la même case**.

- **Compteurs séparés.** L'accéléromètre et le service natif ont désormais chacun leur registre,
  et l'affichage prend le **maximum** des deux (jamais la somme, sinon chaque pas serait compté
  deux fois quand l'app est ouverte). Auparavant, le service — qui repart de zéro à son
  démarrage — devait « rattraper » les centaines de pas déjà relevés par l'accéléromètre avant
  que le compteur ne bouge d'un seul pas. Exactement le symptôme observé.
- **Les deux sources tournent en parallèle.** Plus de bascule de l'une à l'autre : la bascule
  laissait forcément une fenêtre sans aucun compteur actif — c'était la régression de la v0.7.0.
  L'accéléromètre travaille tant que l'app est ouverte, le service travaille tout le temps.
- **L'acquis du jour est transmis au service** à son démarrage : il reprend le comptage là où
  l'accéléromètre l'avait laissé, au lieu de repartir de zéro.
- La notification permanente **affiche le nombre de pas** et se rafraîchit chaque minute : figée
  à « 0 pas », elle laissait croire que le service ne faisait rien.

La chaîne complète (premier démarrage, marche app fermée, deux sources simultanées, redémarrage
du téléphone, passage à minuit) est vérifiée par une simulation qui rejoue la logique Java —
elle a d'ailleurs attrapé un dernier bug avant livraison : l'acquis transmis était effacé au tout
premier démarrage du service.

## 🌙 Nouveautés v0.8 — le réveil cinématographique, et des outils qui ne dorment plus

### Réveil et berceuse : ton image, ton morceau, plein écran

Jusqu'ici, un réveil ne produisait qu'une notification. Désormais **Lennyx prend l'écran**, quel
que soit l'état du téléphone — verrouillé, éteint, ou en pleine autre application.

- **Ton morceau, ta portion.** Choisis un fichier audio de l'appareil, puis délimite à la main le
  passage exact qui te réveillera : la forme d'onde s'affiche, deux poignées se font glisser, et
  l'extrait s'écoute avant validation. C'est cette portion qui tournera en boucle.
- **Ton image.** Une photo de la galerie devient le fond de l'écran de réveil. Lennyx se contente
  de la signer : un filet or, son nom en petit, l'heure. La photo reste la vedette.
- **Il insiste.** Le réveil revient toutes les 2, 5, 10 ou 15 minutes — à ton choix — tant que tu
  n'as pas appuyé sur « Je suis debout ». Le bouton retour ne le congédie pas.
- **Un essai sans conséquence.** « Essayer maintenant » déclenche l'écran réel ; à l'arrêt, le
  réglage revient exactement dans l'état où il était, réveil éteint compris.

Trois mécanismes Android s'additionnent pour y arriver, et aucun n'est superflu : `setAlarmClock`
(seule programmation qui traverse le mode Doze sans être repoussée), la notification à *intention
plein écran* (seul moyen, depuis Android 10, qu'une application en arrière-plan ouvre un écran),
et `showWhenLocked` + `turnScreenOn` sur l'activité. Le son passe par le flux ALARME : il reste
audible en silencieux, et le canal ignore le mode « Ne pas déranger ».

### Chronomètre et Pomodoro en arrière-plan

Ils vivaient dans la mémoire de la page : réduire la fenêtre les figeait, la fermer les effaçait.
Ils sont maintenant décrits par des **instants** (départ, échéance) et non par un compteur qui
s'égrène — on soustrait à la réouverture, on ne rattrape rien.

- Une **notification-chronomètre** qu'Android anime lui-même, en avant pour le chrono, en
  décompte pour le Pomodoro. Aucun processus ne tourne pour ça.
- Une **alarme exacte** à la fin de phase, qui sonne même application fermée.
- Un Pomodoro terminé pendant l'absence est **crédité dès la réouverture**, quel que soit l'onglet
  où l'on retombe — et sans sonner deux fois.

### Présence permanente : trois capteurs plutôt qu'un

Le comptage s'arrêtait dès la fermeture de l'application sur certains appareils. Deux causes,
toutes deux traitées :

- **Chaîne de repli de capteurs.** Le service tente le podomètre matériel (`STEP_COUNTER`), puis
  le détecteur de pas, puis l'accéléromètre avec maintien du processeur. Un téléphone sans
  podomètre matériel compte désormais lui aussi, écran éteint.
- **Chien de garde.** Un réveil exact vérifie toutes les quinze minutes que le service tourne
  encore et le relance sinon — les surcouches constructeur tuent les services sans prévenir.
  Le service survit aussi au balayage hors des applications récentes (`stopWithTask=false`).
- **Exemption de veille, demandée en un bouton.** C'est la première cause de comptage muet sur
  One UI : le diagnostic la signale en clair et propose l'écran système correspondant.
- Le diagnostic dit maintenant **quel capteur sert réellement** et **quand le service a donné
  signe de vie** — de quoi distinguer « service mort » de « tu n'as pas marché ».

### v0.8.1 — le podomètre ne dépend plus de la survie du service

Le comptage hors application ne marchait toujours pas. J'avais mal posé le problème : je
cherchais à **garder le service en vie**, alors que ce n'était pas nécessaire.

`TYPE_STEP_COUNTER` accumule **dans le matériel**, depuis le dernier démarrage du téléphone. Il
continue donc de compter quand Android tue le service, le processus, ou les deux. Il suffisait de
**relire ce compteur à chaque réouverture** et de le comparer à notre valeur de référence pour
retrouver, intacts, tous les pas faits pendant l'absence.

- `catchUp()` fait exactement ça, au lancement et à chaque retour dans l'application. La justesse
  du comptage ne repose plus sur un processus qu'Android peut tuer à sa guise. Le service reste
  utile — il rafraîchit le widget en direct — mais il n'est plus indispensable.
- **Correctif du redémarrage**, trouvé en écrivant le test : après un reboot, les pas faits entre
  le démarrage du téléphone et la première lecture étaient perdus. Le compteur repart de zéro à
  l'instant du boot, donc tout ce qu'il affiche a bien été marché depuis — et doit être crédité.
- **Journal de bord natif** dans le diagnostic (Outils → Pas) : chaque événement daté — service
  démarré et avec quel capteur, recalages, rattrapages, arrêts par le système, refus du chien de
  garde. Après deux corrections à l'aveugle, il fallait pouvoir constater plutôt que supposer.
- Un bouton **« Relire le compteur du téléphone »** force la relecture et annonce combien de pas
  ont été récupérés.

## 🍎 iOS

Le projet iOS existe (`ios/`, Capacitor) et le **podomètre y est plus simple qu'ailleurs** :
`CMPedometer` conserve l'historique des pas sur sept jours, enregistré en continu par le
coprocesseur de mouvement. Lennyx n'a donc **rien à faire tourner en arrière-plan** — il
interroge l'historique à l'ouverture et récupère tout ce qui a été marché entre deux lancements,
sans service, sans notification permanente et sans coût en batterie.

`LennyxPedometerPlugin.swift` implémente ça et est déjà référencé dans le projet Xcode.

**Ce qui manque pour tenir un `.ipa` entre les mains**, en toute franchise :

| Étape | État |
|---|---|
| Projet Xcode, plugin podomètre, permissions | ✅ fait |
| Compilation | ❌ **exige un Mac** — Xcode n'existe pas sous Windows |
| Installation sur un iPhone | ⚠️ signature obligatoire |
| Publication sur l'App Store | 💸 99 $/an |

Avec un Mac et un **identifiant Apple gratuit**, l'installation sur son propre iPhone est
possible sans rien payer : `npm run ios:sync`, ouvrir `ios/App/App.xcworkspace`, choisir son
équipe personnelle et lancer. L'application **expire au bout de 7 jours** et doit être réinstallée
— c'est la limite du compte gratuit, pas celle de Lennyx.

**Sans Mac, l'alternative qui coûte zéro et marche aujourd'hui** : la PWA. Safari → Partager →
« Sur l'écran d'accueil ». Icône, plein écran, fonctionnement hors ligne. Le podomètre et le
réveil plein écran n'y sont pas (Safari n'y donne pas accès), mais tout le reste l'est.

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
- [x] **v0.7** — Présence permanente Android (capteur matériel, service de premier plan, relance
  au démarrage), Oracle qui agit vraiment, escalade des rappels et 7 sonneries, refonte mobile
- [x] **v0.8** — Réveil plein écran natif (extrait audio découpé + image de fond), chronomètre et
  Pomodoro qui survivent en arrière-plan, comptage de pas à trois capteurs avec chien de garde
- [ ] **v0.9** — Social : amis, défis, classements (nécessite un backend supplémentaire —
  même projet Supabase envisagé, à étendre)
- [ ] **v1.0** — Boss de la semaine, saisons, quêtes d'histoire

## 💰 Monétisation

Volontairement **aucune** pour l'instant : Lennyx est une app personnelle et locale. Les tiers
« premium » (cosmétiques exclusifs, cloud sync) sont notés dans la roadmap et ne seront
envisagés que si un backend voit le jour. Tout ce qui existe aujourd'hui restera gratuit.

## 👤 Auteur

**NJUNDIYIMUN BECHARD Miles-Daniel** — Full-Stack Developer, IT Generalist & Security Analyst
Produit **Lennyx IT**.

## 📄 Licence

© 2026 NJUNDIYIMUN BECHARD Miles-Daniel / Lennyx IT — Tous droits réservés.
Voir [`LICENSE`](LICENSE).
