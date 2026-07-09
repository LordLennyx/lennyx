// ── Succès (achievements) et boutique ────────────────────────────────────
import type { Profile } from './types';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  gold: number; // or offert au déblocage
  check: (p: Profile, level: number) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-quest', name: 'Premier sang', desc: 'Accomplir ta première quête', icon: '🩸', gold: 10, check: (p) => p.counters.quests >= 1 },
  { id: 'q10', name: 'Aventurier confirmé', desc: 'Accomplir 10 quêtes', icon: '⚔️', gold: 25, check: (p) => p.counters.quests >= 10 },
  { id: 'q50', name: 'Machine de guerre', desc: 'Accomplir 50 quêtes', icon: '🗡️', gold: 75, check: (p) => p.counters.quests >= 50 },
  { id: 'q100', name: 'Centurion', desc: 'Accomplir 100 quêtes', icon: '🏛️', gold: 150, check: (p) => p.counters.quests >= 100 },
  { id: 'q250', name: 'Légende vivante', desc: 'Accomplir 250 quêtes', icon: '🐉', gold: 400, check: (p) => p.counters.quests >= 250 },
  { id: 'd10', name: 'Routine du héros', desc: 'Accomplir 10 quêtes quotidiennes', icon: '📅', gold: 25, check: (p) => p.counters.dailies >= 10 },
  { id: 'd100', name: 'Discipline de fer', desc: 'Accomplir 100 quêtes quotidiennes', icon: '🔩', gold: 150, check: (p) => p.counters.dailies >= 100 },
  { id: 'd365', name: 'Une année de gloire', desc: 'Accomplir 365 quêtes quotidiennes', icon: '🎆', gold: 500, check: (p) => p.counters.dailies >= 365 },
  { id: 'streak3', name: 'Étincelle', desc: '3 jours de streak', icon: '✨', gold: 15, check: (p) => p.maxStreak >= 3 },
  { id: 'streak7', name: 'En feu', desc: '7 jours de streak', icon: '🔥', gold: 40, check: (p) => p.maxStreak >= 7 },
  { id: 'streak14', name: 'Brasier', desc: '14 jours de streak', icon: '🌋', gold: 80, check: (p) => p.maxStreak >= 14 },
  { id: 'streak30', name: 'Inarrêtable', desc: '30 jours de streak', icon: '☄️', gold: 200, check: (p) => p.maxStreak >= 30 },
  { id: 'streak100', name: 'Force de la nature', desc: '100 jours de streak', icon: '🌪️', gold: 600, check: (p) => p.maxStreak >= 100 },
  { id: 'lvl5', name: 'Ça commence', desc: 'Atteindre le niveau 5', icon: '🌿', gold: 20, check: (_p, lvl) => lvl >= 5 },
  { id: 'lvl10', name: 'Explorateur', desc: 'Atteindre le niveau 10', icon: '🧭', gold: 40, check: (_p, lvl) => lvl >= 10 },
  { id: 'lvl25', name: 'Vétéran', desc: 'Atteindre le niveau 25', icon: '🎖️', gold: 100, check: (_p, lvl) => lvl >= 25 },
  { id: 'lvl50', name: 'Élite', desc: 'Atteindre le niveau 50', icon: '💠', gold: 250, check: (_p, lvl) => lvl >= 50 },
  { id: 'lvl75', name: 'Mythique', desc: 'Atteindre le niveau 75', icon: '🔮', gold: 400, check: (_p, lvl) => lvl >= 75 },
  { id: 'lvl100', name: 'TaskMaster', desc: 'Atteindre le niveau 100', icon: '🏆', gold: 1000, check: (_p, lvl) => lvl >= 100 },
  { id: 'combo5', name: 'Combo x5', desc: '5 tâches accomplies le même jour', icon: '⚡', gold: 30, check: (p) => p.bestCombo >= 5 },
  { id: 'combo10', name: 'Combo x10', desc: '10 tâches accomplies le même jour', icon: '💥', gold: 80, check: (p) => p.bestCombo >= 10 },
  { id: 'epic10', name: 'Tueur d’épiques', desc: 'Accomplir 10 quêtes épiques', icon: '🟣', gold: 100, check: (p) => p.counters.epics >= 10 },
  { id: 'event5', name: 'Chasseur d’événements', desc: 'Accomplir 5 événements spéciaux', icon: '🌟', gold: 80, check: (p) => p.counters.events >= 5 },
  { id: 'early-bird', name: 'Lève-tôt', desc: 'Accomplir une tâche avant 8h du matin', icon: '🌅', gold: 25, check: (p) => !!p.flags.earlyBird },
  { id: 'night-owl', name: 'Oiseau de nuit', desc: 'Accomplir une tâche après 22h', icon: '🦉', gold: 25, check: (p) => !!p.flags.nightOwl },
  { id: 'record', name: 'Record battu', desc: 'Battre ton record de streak sur une quotidienne', icon: '📈', gold: 30, check: (p) => !!p.flags.recordBreaker },
  { id: 'rich', name: 'Trésorier', desc: 'Posséder 500 pièces d’or', icon: '💰', gold: 0, check: (p) => p.gold >= 500 },
];

// ── Boutique ──────────────────────────────────────────────────────────────

export interface AvatarItem {
  emoji: string;
  price: number; // 0 = gratuit
}

export const AVATARS: AvatarItem[] = [
  { emoji: '🙂', price: 0 },
  { emoji: '😎', price: 0 },
  { emoji: '🤖', price: 0 },
  { emoji: '🐱', price: 40 },
  { emoji: '🦊', price: 40 },
  { emoji: '🐺', price: 60 },
  { emoji: '🥷', price: 80 },
  { emoji: '🧙', price: 100 },
  { emoji: '🦁', price: 120 },
  { emoji: '👾', price: 150 },
  { emoji: '🐉', price: 250 },
  { emoji: '⚡', price: 300 },
  { emoji: '👑', price: 500 },
  { emoji: '🏆', price: 800 },
];

export interface ThemeItem {
  id: string;
  name: string;
  price: number;
  accent: string;
  accent2: string;
}

export const THEMES: ThemeItem[] = [
  { id: 'nebula', name: 'Nébuleuse', price: 0, accent: '#8b5cf6', accent2: '#22d3ee' },
  { id: 'cyber', name: 'Cyberpunk', price: 100, accent: '#f0f', accent2: '#0ff' },
  { id: 'ember', name: 'Braise', price: 100, accent: '#f97316', accent2: '#ef4444' },
  { id: 'aurora', name: 'Aurore', price: 150, accent: '#10b981', accent2: '#38bdf8' },
  { id: 'royal', name: 'Royal', price: 250, accent: '#fbbf24', accent2: '#a78bfa' },
  { id: 'blood', name: 'Sang de dragon', price: 400, accent: '#ef4444', accent2: '#fbbf24' },
];
