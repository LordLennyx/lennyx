// ── Lecture des compteurs de pas ──────────────────────────────────────────
// Isolé ici pour que le store ET l'Oracle lisent exactement la même chose.

import type { Profile } from './types';

/**
 * Pas d'une journée.
 *
 * L'accéléromètre (application ouverte) et le service Android (continu)
 * mesurent la MÊME marche : on retient le meilleur des deux, jamais leur
 * somme — ce serait du double comptage. Le manuel s'ajoute, lui, car c'est
 * un complément volontaire.
 *
 * ⚠ Ne jamais faire écrire une source par-dessus l'autre : le service natif
 * repart de zéro à chaque démarrage et effacerait le total de la journée
 * (bug v0.7.1 : le compteur restait figé tant que le natif n'avait pas
 * rattrapé l'accéléromètre).
 */
export function stepsOn(p: Profile, date: string): number {
  const sensor = Math.max(p.steps.counted[date] ?? 0, p.steps.native?.[date] ?? 0);
  return sensor + (p.steps.manual[date] ?? 0);
}
