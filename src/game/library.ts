// ── Bibliothèque de modèles de tâches, par rubrique ───────────────────────
// L'utilisateur génère ses tâches en un clic depuis ce catalogue.
// kind 'daily' → quête quotidienne (days suggérés), kind 'timed' → quotidienne
// chronométrée (valider avant `before`), kind 'quest' → quête ponctuelle.

import type { Difficulty } from './engine';

export interface TaskTemplate {
  title: string;
  desc?: string;
  kind: 'daily' | 'timed' | 'quest';
  difficulty: Difficulty;
  days?: number[]; // suggérés (0=dim..6=sam) ; absent = tous les jours
  before?: string; // HH:MM pour kind 'timed'
}

export interface Rubrique {
  id: string;
  name: string;
  icon: string;
  desc: string;
  templates: TaskTemplate[];
}

const WK = [1, 2, 3, 4, 5]; // lundi→vendredi
const WE = [6, 0]; // week-end

export const LIBRARY: Rubrique[] = [
  {
    id: 'travail',
    name: 'Travail',
    icon: 'briefcase',
    desc: 'Carrière, bureau, productivité professionnelle',
    templates: [
      { title: 'Arriver au travail avant 8h00', kind: 'timed', before: '08:00', difficulty: 'normal', days: WK },
      { title: 'Préparer sa journée de travail', desc: 'Lister les 3 priorités du jour', kind: 'timed', before: '09:00', difficulty: 'easy', days: WK },
      { title: 'Zéro réseau social au bureau le matin', kind: 'timed', before: '12:00', difficulty: 'hard', days: WK },
      { title: 'Traiter sa boîte mail', kind: 'daily', difficulty: 'easy', days: WK },
      { title: 'Une session de travail profond (90 min)', desc: 'Sans interruption ni notification', kind: 'daily', difficulty: 'hard', days: WK },
      { title: 'Faire une vraie pause déjeuner', desc: 'Loin de l’écran', kind: 'daily', difficulty: 'easy', days: WK },
      { title: 'Noter ses accomplissements du jour', kind: 'daily', difficulty: 'easy', days: WK },
      { title: 'Préparer sa semaine (planification)', kind: 'daily', difficulty: 'normal', days: [1] },
      { title: 'Ranger son bureau avant de partir', kind: 'daily', difficulty: 'easy', days: WK },
      { title: 'Demander un feedback à un collègue', kind: 'quest', difficulty: 'normal' },
      { title: 'Mettre à jour son CV', kind: 'quest', difficulty: 'normal' },
      { title: 'Terminer le dossier en retard', kind: 'quest', difficulty: 'hard' },
      { title: 'Négocier une augmentation', kind: 'quest', difficulty: 'epic' },
    ],
  },
  {
    id: 'etudes',
    name: 'Études & Apprentissage',
    icon: 'book',
    desc: 'Cours, révisions, compétences nouvelles',
    templates: [
      { title: 'Réviser 45 minutes', kind: 'daily', difficulty: 'normal' },
      { title: 'Relire ses notes du jour', kind: 'daily', difficulty: 'easy', days: WK },
      { title: 'Faire ses exercices avant 20h', kind: 'timed', before: '20:00', difficulty: 'normal', days: WK },
      { title: 'Lire 20 pages', kind: 'daily', difficulty: 'normal' },
      { title: '15 minutes de langue étrangère', kind: 'daily', difficulty: 'easy' },
      { title: 'Regarder un cours en ligne', kind: 'daily', difficulty: 'normal' },
      { title: 'Faire des flashcards de révision', kind: 'daily', difficulty: 'easy' },
      { title: 'Terminer un chapitre complet', kind: 'quest', difficulty: 'normal' },
      { title: 'Rendre le devoir avant la deadline', kind: 'quest', difficulty: 'hard' },
      { title: 'Préparer l’examen', desc: 'Plan de révision + fiches', kind: 'quest', difficulty: 'hard' },
      { title: 'Obtenir une certification', kind: 'quest', difficulty: 'epic' },
    ],
  },
  {
    id: 'hygiene',
    name: 'Hygiène & Soins',
    icon: 'droplet',
    desc: 'Soins du corps, propreté, apparence',
    templates: [
      { title: 'Se doucher avant 21h', kind: 'timed', before: '21:00', difficulty: 'easy' },
      { title: 'Se brosser les dents matin et soir', kind: 'daily', difficulty: 'easy' },
      { title: 'Routine visage du matin', kind: 'timed', before: '09:00', difficulty: 'easy' },
      { title: 'Passer le fil dentaire', kind: 'daily', difficulty: 'easy' },
      { title: 'Soin des mains et ongles', kind: 'daily', difficulty: 'easy', days: [0] },
      { title: 'Préparer sa tenue pour demain', kind: 'timed', before: '22:00', difficulty: 'easy', days: [0, 1, 2, 3, 4] },
      { title: 'Aller chez le coiffeur', kind: 'quest', difficulty: 'easy' },
      { title: 'Prendre rendez-vous chez le dentiste', kind: 'quest', difficulty: 'normal' },
      { title: 'Grand soin complet du dimanche', kind: 'daily', difficulty: 'normal', days: [0] },
    ],
  },
  {
    id: 'sport',
    name: 'Sport & Forme',
    icon: 'heart',
    desc: 'Entraînement, mouvement, dépassement',
    templates: [
      { title: 'Séance de sport', kind: 'daily', difficulty: 'hard', days: [1, 3, 5] },
      { title: '30 pompes', kind: 'daily', difficulty: 'normal' },
      { title: '10 000 pas', kind: 'daily', difficulty: 'normal' },
      { title: 'Étirements matinaux avant 8h', kind: 'timed', before: '08:00', difficulty: 'easy' },
      { title: '20 minutes de cardio', kind: 'daily', difficulty: 'normal', days: [2, 4] },
      { title: 'Sortie course à pied', kind: 'daily', difficulty: 'hard', days: WE },
      { title: 'Gainage 5 minutes', kind: 'daily', difficulty: 'normal' },
      { title: 'Monter les escaliers toute la journée', desc: 'Zéro ascenseur', kind: 'daily', difficulty: 'easy', days: WK },
      { title: 'Courir 10 km', kind: 'quest', difficulty: 'hard' },
      { title: 'S’inscrire à une compétition', kind: 'quest', difficulty: 'epic' },
      { title: 'Battre son record personnel', kind: 'quest', difficulty: 'epic' },
    ],
  },
  {
    id: 'nutrition',
    name: 'Nutrition & Cuisine',
    icon: 'bowl',
    desc: 'Alimentation, hydratation, repas maison',
    templates: [
      { title: 'Boire 2 litres d’eau', kind: 'daily', difficulty: 'easy' },
      { title: 'Petit-déjeuner complet avant 9h', kind: 'timed', before: '09:00', difficulty: 'easy' },
      { title: 'Cuisiner son repas (pas de livraison)', kind: 'daily', difficulty: 'normal' },
      { title: 'Zéro sucre ajouté aujourd’hui', kind: 'daily', difficulty: 'hard' },
      { title: '5 fruits et légumes', kind: 'daily', difficulty: 'normal' },
      { title: 'Dîner avant 21h', kind: 'timed', before: '21:00', difficulty: 'easy' },
      { title: 'Préparer ses repas de la semaine', kind: 'daily', difficulty: 'hard', days: [0] },
      { title: 'Zéro alcool cette semaine', kind: 'quest', difficulty: 'hard' },
      { title: 'Tester une nouvelle recette', kind: 'quest', difficulty: 'normal' },
      { title: 'Un mois sans fast-food', kind: 'quest', difficulty: 'epic' },
    ],
  },
  {
    id: 'maison',
    name: 'Maison & Ménage',
    icon: 'home',
    desc: 'Rangement, entretien, organisation du foyer',
    templates: [
      { title: 'Faire son lit avant 9h', kind: 'timed', before: '09:00', difficulty: 'easy' },
      { title: 'Vaisselle faite avant de dormir', kind: 'timed', before: '23:00', difficulty: 'easy' },
      { title: '15 minutes de rangement', kind: 'daily', difficulty: 'easy' },
      { title: 'Sortir les poubelles', kind: 'daily', difficulty: 'easy', days: [2, 5] },
      { title: 'Lessive de la semaine', kind: 'daily', difficulty: 'normal', days: [6] },
      { title: 'Ménage complet', kind: 'daily', difficulty: 'hard', days: [6] },
      { title: 'Arroser les plantes', kind: 'daily', difficulty: 'easy', days: [1, 4] },
      { title: 'Trier un placard', kind: 'quest', difficulty: 'normal' },
      { title: 'Réparer ce qui traîne depuis des mois', kind: 'quest', difficulty: 'hard' },
      { title: 'Grand tri de printemps', kind: 'quest', difficulty: 'epic' },
    ],
  },
  {
    id: 'finances',
    name: 'Finances',
    icon: 'coin',
    desc: 'Budget, épargne, administratif',
    templates: [
      { title: 'Noter ses dépenses du jour', kind: 'daily', difficulty: 'easy' },
      { title: 'Zéro achat impulsif aujourd’hui', kind: 'daily', difficulty: 'normal' },
      { title: 'Vérifier ses comptes', kind: 'daily', difficulty: 'easy', days: [1] },
      { title: 'Faire son budget du mois', kind: 'quest', difficulty: 'normal' },
      { title: 'Mettre de côté son épargne du mois', kind: 'quest', difficulty: 'normal' },
      { title: 'Payer les factures en attente', kind: 'quest', difficulty: 'normal' },
      { title: 'Résilier un abonnement inutile', kind: 'quest', difficulty: 'easy' },
      { title: 'Faire sa déclaration d’impôts', kind: 'quest', difficulty: 'hard' },
      { title: 'Négocier un contrat (assurance, forfait…)', kind: 'quest', difficulty: 'hard' },
      { title: 'Constituer 3 mois d’épargne de sécurité', kind: 'quest', difficulty: 'epic' },
    ],
  },
  {
    id: 'social',
    name: 'Social & Famille',
    icon: 'users',
    desc: 'Proches, amis, liens qui comptent',
    templates: [
      { title: 'Appeler un proche', kind: 'daily', difficulty: 'easy', days: [0, 3] },
      { title: 'Prendre des nouvelles d’un ami', kind: 'daily', difficulty: 'easy', days: [2, 5] },
      { title: 'Repas en famille sans téléphone', kind: 'daily', difficulty: 'normal' },
      { title: 'Dire merci à quelqu’un sincèrement', kind: 'daily', difficulty: 'easy' },
      { title: 'Organiser une sortie entre amis', kind: 'quest', difficulty: 'normal' },
      { title: 'Rendre visite à la famille', kind: 'quest', difficulty: 'normal' },
      { title: 'Offrir un cadeau sans occasion', kind: 'quest', difficulty: 'normal' },
      { title: 'Se réconcilier avec quelqu’un', kind: 'quest', difficulty: 'epic' },
      { title: 'Souhaiter les anniversaires du mois', kind: 'daily', difficulty: 'easy', days: [1] },
    ],
  },
  {
    id: 'esprit',
    name: 'Esprit & Bien-être',
    icon: 'brain',
    desc: 'Méditation, journal, santé mentale',
    templates: [
      { title: '10 minutes de méditation', kind: 'daily', difficulty: 'normal' },
      { title: 'Écrire dans son journal', kind: 'daily', difficulty: 'easy' },
      { title: '3 gratitudes du jour', kind: 'daily', difficulty: 'easy' },
      { title: 'Marche sans écouteurs ni téléphone', kind: 'daily', difficulty: 'normal' },
      { title: 'Respiration profonde avant 8h', kind: 'timed', before: '08:00', difficulty: 'easy' },
      { title: 'Une heure sans écran avant de dormir', kind: 'timed', before: '23:59', difficulty: 'hard' },
      { title: 'Dire non à une sollicitation de trop', kind: 'daily', difficulty: 'normal' },
      { title: 'Planifier une vraie journée de repos', kind: 'quest', difficulty: 'normal' },
      { title: 'Désencombrer son esprit : tout noter', kind: 'quest', difficulty: 'easy' },
      { title: 'Une semaine de digital detox le soir', kind: 'quest', difficulty: 'epic' },
    ],
  },
  {
    id: 'creativite',
    name: 'Créativité',
    icon: 'quill',
    desc: 'Écriture, musique, dessin, projets perso',
    templates: [
      { title: 'Écrire 300 mots', kind: 'daily', difficulty: 'normal' },
      { title: 'Dessiner 15 minutes', kind: 'daily', difficulty: 'easy' },
      { title: 'Pratiquer son instrument', kind: 'daily', difficulty: 'normal' },
      { title: 'Noter 3 idées nouvelles', kind: 'daily', difficulty: 'easy' },
      { title: 'Avancer son projet perso (1h)', kind: 'daily', difficulty: 'hard', days: [2, 4, 6] },
      { title: 'Photographier quelque chose de beau', kind: 'daily', difficulty: 'easy' },
      { title: 'Terminer une œuvre commencée', kind: 'quest', difficulty: 'hard' },
      { title: 'Publier / partager une création', kind: 'quest', difficulty: 'hard' },
      { title: 'Achever le grand projet de l’année', kind: 'quest', difficulty: 'epic' },
    ],
  },
  {
    id: 'tech',
    name: 'Tech & Code',
    icon: 'terminal',
    desc: 'Programmation, veille, side-projects',
    templates: [
      { title: 'Coder 1 heure sur son side-project', kind: 'daily', difficulty: 'normal' },
      { title: 'Résoudre un exercice d’algorithmique', kind: 'daily', difficulty: 'normal' },
      { title: 'Faire sa veille technologique (20 min)', kind: 'daily', difficulty: 'easy' },
      { title: 'Un commit par jour', kind: 'daily', difficulty: 'easy' },
      { title: 'Lire de la documentation technique', kind: 'daily', difficulty: 'normal', days: [2, 4] },
      { title: 'Sauvegarder ses données', kind: 'daily', difficulty: 'easy', days: [0] },
      { title: 'Nettoyer son bureau numérique', desc: 'Downloads, bureau, onglets', kind: 'daily', difficulty: 'easy', days: [5] },
      { title: 'Mettre à jour ses mots de passe critiques', kind: 'quest', difficulty: 'normal' },
      { title: 'Déployer un projet en production', kind: 'quest', difficulty: 'hard' },
      { title: 'Contribuer à un projet open source', kind: 'quest', difficulty: 'epic' },
      { title: 'Apprendre un nouveau langage/framework', kind: 'quest', difficulty: 'epic' },
    ],
  },
  {
    id: 'sommeil',
    name: 'Sommeil & Rythme',
    icon: 'moon',
    desc: 'Coucher, lever, énergie',
    templates: [
      { title: 'Se lever avant 7h', kind: 'timed', before: '07:00', difficulty: 'hard', days: WK },
      { title: 'Se lever avant 8h', kind: 'timed', before: '08:00', difficulty: 'normal' },
      { title: 'Au lit avant 23h', kind: 'timed', before: '23:00', difficulty: 'normal' },
      { title: 'Pas de café après 16h', kind: 'daily', difficulty: 'easy' },
      { title: 'Téléphone hors de la chambre', kind: 'daily', difficulty: 'hard' },
      { title: 'Sieste de 20 minutes max', kind: 'daily', difficulty: 'easy', days: WE },
      { title: 'Se lever sans snooze', kind: 'timed', before: '09:00', difficulty: 'hard' },
      { title: 'Une semaine de coucher régulier', kind: 'quest', difficulty: 'hard' },
      { title: 'Réorganiser sa chambre pour mieux dormir', kind: 'quest', difficulty: 'normal' },
    ],
  },
];

export function rubrique(id: string | undefined): Rubrique | undefined {
  return LIBRARY.find((r) => r.id === id);
}

export const TEMPLATE_COUNT = LIBRARY.reduce((n, r) => n + r.templates.length, 0);
