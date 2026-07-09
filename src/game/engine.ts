// ── Moteur de récompenses : XP, or, combos, streaks ──────────────────────

export type Difficulty = 'easy' | 'normal' | 'hard' | 'epic';
export type QuestType = 'quest' | 'event';

export interface DifficultyDef {
  label: string;
  icon: string;
  color: string;
  questXp: number;
  dailyXp: number;
  gold: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { label: 'Facile', icon: '🟢', color: '#4ade80', questXp: 25, dailyXp: 10, gold: 5 },
  normal: { label: 'Normal', icon: '🔵', color: '#38bdf8', questXp: 40, dailyXp: 15, gold: 10 },
  hard: { label: 'Difficile', icon: '🟠', color: '#fb923c', questXp: 60, dailyXp: 25, gold: 20 },
  epic: { label: 'Épique', icon: '🟣', color: '#c084fc', questXp: 90, dailyXp: 40, gold: 35 },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard', 'epic'];

/** Facteur d'échelle : la récompense XP augmente avec le niveau. */
const LEVEL_SCALING = 0.05;
/** Bonus par cran de combo (tâches accomplies le même jour). */
const COMBO_STEP = 0.05;
const COMBO_MAX = 0.5;
/** Bonus par jour de streak sur une quête quotidienne. */
const STREAK_STEP = 0.02;
const STREAK_MAX = 0.5;
/** Bonus quand on bat son record de streak. */
export const RECORD_BONUS = 0.25;
/** Pénalité (fraction de l'XP de base) par quête quotidienne manquée. */
export const MISS_PENALTY = 0.5;

export function scaledXp(base: number, level: number): number {
  return Math.round(base * (1 + LEVEL_SCALING * level));
}

export function comboMultiplier(combo: number): number {
  return 1 + Math.min(Math.max(combo - 1, 0) * COMBO_STEP, COMBO_MAX);
}

export function streakMultiplier(streak: number): number {
  return 1 + Math.min(Math.max(streak - 1, 0) * STREAK_STEP, STREAK_MAX);
}

export function questBaseXp(difficulty: Difficulty, type: QuestType): number {
  const base = DIFFICULTIES[difficulty].questXp;
  return type === 'event' ? base * 2 : base;
}

export function questGold(difficulty: Difficulty, type: QuestType): number {
  const g = DIFFICULTIES[difficulty].gold;
  return type === 'event' ? g * 2 : g;
}

// ── Helpers de dates (dates locales, format YYYY-MM-DD) ──────────────────

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** Jour de la semaine : 0 = dimanche … 6 = samedi. */
export function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay();
}

export const WEEKDAYS = [
  { id: 1, short: 'Lun' },
  { id: 2, short: 'Mar' },
  { id: 3, short: 'Mer' },
  { id: 4, short: 'Jeu' },
  { id: 5, short: 'Ven' },
  { id: 6, short: 'Sam' },
  { id: 0, short: 'Dim' },
];

/** Une quête quotidienne est-elle programmée ce jour-là ? (days vide = tous les jours) */
export function isScheduledOn(days: number[], dateStr: string): boolean {
  return days.length === 0 || days.includes(dayOfWeek(dateStr));
}

/** Dernière date programmée strictement avant `dateStr` (pour la logique de streak). */
export function previousScheduledDate(days: number[], dateStr: string): string {
  let d = addDays(dateStr, -1);
  for (let i = 0; i < 7; i++) {
    if (isScheduledOn(days, d)) return d;
    d = addDays(d, -1);
  }
  return addDays(dateStr, -1);
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
