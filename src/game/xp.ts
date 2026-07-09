// ── Système de niveaux et de rangs de Lennyx ─────────────────────────────
// Courbe reprise du design original "Adventure To-Do App" : 25 000 XP
// au total pour atteindre le niveau 100.

export interface RankDef {
  min: number;
  max: number;
  name: string;
  icon: string;
  color: string;
}

export const RANKS: RankDef[] = [
  { min: 0, max: 0, name: 'Newcomer', icon: '🌱', color: '#8a8f98' },
  { min: 1, max: 10, name: 'Adventurer', icon: '🗡️', color: '#6ee7b7' },
  { min: 11, max: 20, name: 'Explorer', icon: '🧭', color: '#4cc9f0' },
  { min: 21, max: 30, name: 'Quest Seeker', icon: '🔎', color: '#38bdf8' },
  { min: 31, max: 40, name: 'Trailblazer', icon: '🔥', color: '#fb923c' },
  { min: 41, max: 50, name: 'Pathfinder', icon: '🗺️', color: '#f59e0b' },
  { min: 51, max: 60, name: 'Task Slayer', icon: '⚔️', color: '#f43f5e' },
  { min: 61, max: 70, name: 'Heroic Achiever', icon: '🛡️', color: '#a78bfa' },
  { min: 71, max: 80, name: 'Legendary Hunter', icon: '🏹', color: '#c084fc' },
  { min: 81, max: 85, name: 'Mastermind', icon: '🧠', color: '#e879f9' },
  { min: 86, max: 90, name: 'Quest Legend', icon: '🌟', color: '#facc15' },
  { min: 91, max: 95, name: 'Ultimate Tasker', icon: '💎', color: '#22d3ee' },
  { min: 96, max: 99, name: 'Grandmaster', icon: '👑', color: '#fbbf24' },
  { min: 100, max: 100, name: 'TaskMaster', icon: '🏆', color: '#ffd700' },
];

// [niveau min, niveau max, XP nécessaire par niveau dans cette tranche]
const BANDS: Array<[number, number, number]> = [
  [1, 10, 50],
  [11, 20, 80],
  [21, 30, 100],
  [31, 40, 120],
  [41, 50, 150],
  [51, 60, 200],
  [61, 70, 250],
  [71, 80, 300],
  [81, 85, 350],
  [86, 90, 500],
  [91, 95, 600],
  [96, 99, 700],
  [100, 100, 5000],
];

export const MAX_LEVEL = 100;

/** XP nécessaire pour passer du niveau `level - 1` au niveau `level`. */
export function xpForLevel(level: number): number {
  for (const [a, b, xp] of BANDS) {
    if (level >= a && level <= b) return xp;
  }
  return Number.POSITIVE_INFINITY;
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
  let level = 0;
  let rest = Math.max(0, Math.floor(xp));
  while (level < MAX_LEVEL && rest >= xpForLevel(level + 1)) {
    rest -= xpForLevel(level + 1);
    level++;
  }
  const xpNeeded = level >= MAX_LEVEL ? 0 : xpForLevel(level + 1);
  return {
    level,
    rank: rankForLevel(level),
    xpInLevel: rest,
    xpNeeded,
    progress: xpNeeded > 0 ? rest / xpNeeded : 1,
  };
}
