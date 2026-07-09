// ── Système de niveaux et de rangs de Lennyx (courbe v2) ─────────────────
// v2 : progression longue (~150 000 XP au total). Les premiers niveaux tombent
// vite (onboarding), puis chaque niveau coûte de plus en plus cher — atteindre
// le niveau 100 demande plusieurs mois d'assiduité réelle.
// Formule : coût(n) = 40 + 2.4·n^1.6, arrondi aux 5 XP.

export interface RankDef {
  min: number;
  max: number;
  name: string;
  icon: string; // nom d'icône (composant Icon)
  color: string;
}

export const RANKS: RankDef[] = [
  { min: 0, max: 0, name: 'Newcomer', icon: 'seed', color: '#8a8f98' },
  { min: 1, max: 10, name: 'Adventurer', icon: 'sword', color: '#7fd1ae' },
  { min: 11, max: 20, name: 'Explorer', icon: 'compass', color: '#5cb8e4' },
  { min: 21, max: 30, name: 'Quest Seeker', icon: 'target', color: '#4a9fe8' },
  { min: 31, max: 40, name: 'Trailblazer', icon: 'flame', color: '#e8964a' },
  { min: 41, max: 50, name: 'Pathfinder', icon: 'map', color: '#d4af37' },
  { min: 51, max: 60, name: 'Task Slayer', icon: 'blades', color: '#e05263' },
  { min: 61, max: 70, name: 'Heroic Achiever', icon: 'shield', color: '#a78bfa' },
  { min: 71, max: 80, name: 'Legendary Hunter', icon: 'bow', color: '#c084fc' },
  { min: 81, max: 85, name: 'Mastermind', icon: 'brain', color: '#e879f9' },
  { min: 86, max: 90, name: 'Quest Legend', icon: 'star', color: '#f2c14e' },
  { min: 91, max: 95, name: 'Ultimate Tasker', icon: 'gem', color: '#43d9e8' },
  { min: 96, max: 99, name: 'Grandmaster', icon: 'crown', color: '#e8b64a' },
  { min: 100, max: 100, name: 'TaskMaster', icon: 'laurel', color: '#ffd700' },
];

export const MAX_LEVEL = 100;

/** XP nécessaire pour passer du niveau `level - 1` au niveau `level`. */
export function xpForLevel(level: number): number {
  if (level < 1 || level > MAX_LEVEL) return Number.POSITIVE_INFINITY;
  return Math.round((40 + 2.4 * Math.pow(level, 1.6)) / 5) * 5;
}

// cumul mémoïsé
const CUM: number[] = [0];
for (let l = 1; l <= MAX_LEVEL; l++) CUM[l] = CUM[l - 1] + xpForLevel(l);

/** XP totale nécessaire pour atteindre le niveau `level`. */
export function totalXpForLevel(level: number): number {
  return CUM[Math.min(Math.max(level, 0), MAX_LEVEL)];
}

export function rankForLevel(level: number): RankDef {
  return RANKS.find((r) => level >= r.min && level <= r.max) ?? RANKS[0];
}

export interface LevelInfo {
  level: number;
  rank: RankDef;
  xpInLevel: number;
  xpNeeded: number; // XP pour le prochain niveau (0 si niveau max)
  progress: number; // 0..1
}

export function levelFromXp(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp));
  let level = 0;
  while (level < MAX_LEVEL && total >= CUM[level + 1]) level++;
  const xpNeeded = level >= MAX_LEVEL ? 0 : xpForLevel(level + 1);
  const xpInLevel = total - CUM[level];
  return {
    level,
    rank: rankForLevel(level),
    xpInLevel,
    xpNeeded,
    progress: xpNeeded > 0 ? xpInLevel / xpNeeded : 1,
  };
}
