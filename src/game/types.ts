import type { Difficulty, QuestType } from './engine';

export interface SubQuest {
  id: string;
  title: string;
  done: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description?: string;
  type: QuestType; // 'quest' | 'event' (événement spécial = double récompense)
  difficulty: Difficulty;
  category?: string; // id de rubrique (library.ts)
  deadline?: string; // YYYY-MM-DD
  subquests: SubQuest[];
  createdAt: string; // ISO
  completedAt?: string; // ISO
  xpAwarded?: number;
  goldAwarded?: number;
}

export interface Daily {
  id: string;
  title: string;
  description?: string;
  difficulty: Difficulty;
  category?: string;
  days: number[]; // jours programmés (0=dim..6=sam) ; vide = tous les jours
  timeLimit?: string; // HH:MM — tâche chronométrée : valider avant cette heure
  createdAt: string; // YYYY-MM-DD
  streak: number;
  bestStreak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  completions: string[]; // historique de dates YYYY-MM-DD (borné)
}

export interface Counters {
  quests: number;
  events: number;
  epics: number;
  dailies: number;
  subquests: number;
  punctual: number; // tâches chronométrées validées à l'heure
  late: number; // validées en retard
  perfectDays: number; // journées où toutes les quotidiennes programmées ont été faites
  generated: number; // tâches créées depuis la bibliothèque
  oracleAsks: number; // messages envoyés à l'Oracle
}

export interface OracleMessage {
  id: string;
  role: 'user' | 'oracle';
  text: string;
  ts: number;
}

export interface Profile {
  name: string;
  title: string; // id de titre porté (content.ts)
  sigil: string; // id de sigil porté
  xp: number;
  gold: number;
  currentStreak: number; // jours consécutifs avec au moins une tâche accomplie
  maxStreak: number;
  lastActiveDate?: string; // YYYY-MM-DD
  combo: number;
  lastComboDate?: string;
  bestCombo: number;
  counters: Counters;
  categories: Record<string, number>; // rubrique -> nb de complétions
  flags: { earlyBird?: boolean; nightOwl?: boolean; recordBreaker?: boolean };
  unlocked: Record<string, string>; // achievementId -> date de déblocage
  ownedSigils: string[];
  ownedThemes: string[];
  ownedTitles: string[];
  ownedEffects: string[];
  theme: string;
  ambientFx: string; // effet de fond actif ('none' possible)
  burstFx: string; // effet de complétion actif
  soundOn: boolean;
  motionOn: boolean; // animations ambiantes on/off
  oracle: { briefing: boolean; sentinel: boolean; lastBriefing?: string; lastSentinel?: string };
  lastPerfectDay?: string; // dernière journée parfaite comptée (YYYY-MM-DD)
  history: Record<string, number>; // YYYY-MM-DD -> XP gagné ce jour-là
}

export interface Toast {
  id: string;
  icon: string; // nom d'icône
  text: string;
  kind: 'xp' | 'gold' | 'achievement' | 'warn' | 'info' | 'unlock';
}

export interface LevelUpInfo {
  level: number;
  rankName: string;
  rankIcon: string;
  rankChanged: boolean;
  unlocks: string[]; // libellés des nouveautés débloquées à ce niveau
}

export interface FxEvent {
  id: number;
  x: number;
  y: number;
}
