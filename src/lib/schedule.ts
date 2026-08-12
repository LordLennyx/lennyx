// ── Calcul de l'escalade des rappels ──────────────────────────────────────
// Logique pure, sans React ni effet de bord : elle décide QUAND prévenir et
// avec QUEL ton. Isolée ici pour être vérifiable par des tests, puisqu'on ne
// peut pas attendre une journée entière pour observer le comportement réel.

import type { Difficulty } from '../game/engine';
import type { NotifKind } from './notify';

export type Intensity = 'discret' | 'normal' | 'duolingo';

/**
 * Minutes AVANT l'heure limite. Une tâche facile n'a pas besoin d'être
 * annoncée une heure à l'avance ; une épique, si — c'est le « millimètre »
 * demandé : la densité suit l'importance.
 */
export const BASE_OFFSETS: Record<Difficulty, number[]> = {
  easy: [15, 5, 0],
  normal: [30, 15, 5, 0],
  hard: [60, 30, 15, 5, 2, 0],
  epic: [120, 60, 30, 15, 10, 5, 2, 0],
};

/** Minutes APRÈS l'heure limite, tant que la tâche reste non faite. */
export const AFTER_OFFSETS: Record<Intensity, number[]> = {
  discret: [],
  normal: [15],
  duolingo: [10, 30, 60],
};

/** Rappels d'échéance des quêtes, en jours avant (négatif = retard). */
export const QUEST_DAY_OFFSETS: Record<Intensity, number[]> = {
  discret: [0],
  normal: [1, 0],
  duolingo: [3, 1, 0, -1, -3],
};

/** Paliers de rappel effectifs, du plus lointain au plus proche, sans le zéro. */
export function offsetsFor(difficulty: Difficulty, intensity: Intensity): number[] {
  const base = BASE_OFFSETS[difficulty];
  let list: number[];
  if (intensity === 'discret') list = base.slice(-2);
  else if (intensity === 'normal') list = base;
  // implacable : vigilance doublée sur la dernière demi-heure
  else list = [...base, 45, 20, 10, 3, 1];
  return Array.from(new Set(list.filter((n) => n > 0))).sort((a, b) => b - a);
}

/** Le ton monte à mesure que la fenêtre se referme. */
export function kindForRemaining(minutes: number): NotifKind {
  if (minutes <= 0) return 'lastcall';
  if (minutes <= 15) return 'urgent';
  return 'reminder';
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function hhmmOf(total: number): string {
  const t = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Identifiant numérique stable (Android exige un entier). */
export function numId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2000000000;
}
