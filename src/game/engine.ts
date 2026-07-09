// ── Moteur de récompenses : XP, or, combos, streaks, ponctualité ──────────

export type Difficulty = 'easy' | 'normal' | 'hard' | 'epic';
export type QuestType = 'quest' | 'event';

export interface DifficultyDef {
  label: string;
  color: string;
  questXp: number;
  dailyXp: number;
  gold: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { label: 'Facile', color: '#7fd1ae', questXp: 25, dailyXp: 10, gold: 4 },
  normal: { label: 'Normal', color: '#5cb8e4', questXp: 40, dailyXp: 15, gold: 8 },
  hard: { label: 'Difficile', color: '#e8964a', questXp: 60, dailyXp: 25, gold: 15 },
  epic: { label: 'Épique', color: '#b48ef0', questXp: 90, dailyXp: 40, gold: 28 },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard', 'epic'];

/** La récompense XP augmente doucement avec le niveau (inflation contenue en v2). */
const LEVEL_SCALING = 0.03;
/** Bonus par cran de combo (tâches accomplies le même jour). */
const COMBO_STEP = 0.05;
const COMBO_MAX = 0.4;
/** Bonus par jour de streak sur une quête quotidienne. */
const STREAK_STEP = 0.02;
const STREAK_MAX = 0.6;
/** Bonus quand on bat son record de streak. */
export const RECORD_BONUS = 0.25;
/** Bonus de ponctualité (tâche chronométrée validée avant l'heure limite). */
export const PUNCTUAL_BONUS = 0.25;
/** Facteur appliqué à une tâche chronométrée validée en retard. */
export const LATE_FACTOR = 0.5;
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

// ── Helpers de dates et d'heures (tout en local) ──────────────────────────

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

/** Heure courante au format HH:MM. */
export function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** true si l'heure courante est ≤ limite HH:MM. */
export function isOnTime(limit: string): boolean {
  return nowTimeStr() <= limit;
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
