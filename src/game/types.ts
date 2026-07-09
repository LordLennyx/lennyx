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
  category?: string;
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
  days: number[]; // jours programmés (0=dim..6=sam) ; vide = tous les jours
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
}

export interface Profile {
  name: string;
  avatar: string;
  xp: number;
  gold: number;
  currentStreak: number; // jours consécutifs avec au moins une tâche accomplie
  maxStreak: number;
  lastActiveDate?: string; // YYYY-MM-DD
  combo: number; // tâches accomplies aujourd'hui
  lastComboDate?: string;
  bestCombo: number;
  counters: Counters;
  flags: { earlyBird?: boolean; nightOwl?: boolean; recordBreaker?: boolean };
  unlocked: Record<string, string>; // achievementId -> date de déblocage
  ownedAvatars: string[];
  ownedThemes: string[];
  theme: string;
  soundOn: boolean;
  history: Record<string, number>; // YYYY-MM-DD -> XP gagné ce jour-là
}

export interface Toast {
  id: string;
  icon: string;
  text: string;
  kind: 'xp' | 'gold' | 'achievement' | 'warn' | 'info';
}

export interface LevelUpInfo {
  level: number;
  rankName: string;
  rankIcon: string;
  rankChanged: boolean;
}
