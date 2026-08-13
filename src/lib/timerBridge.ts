// ── Chronomètre et Pomodoro qui survivent à la fermeture ──────────────────
// Aucune boucle JavaScript ne survit à la mise en arrière-plan : dès que la
// fenêtre disparaît, les setInterval sont gelés puis oubliés. On confie donc
// le temps au système :
//   • une notification en mode chronomètre, qu'Android anime lui-même ;
//   • une alarme exacte à l'instant de fin de phase, qui sonne.
// L'application ne fait plus que relire des horodatages à sa réouverture.

import { registerPlugin, Capacitor } from '@capacitor/core';

/** Identifiants fixes : un par outil, pour pouvoir les remplacer/annuler. */
export const TIMER_ID = { chrono: 5001, pomodoro: 5003 } as const;

interface LennyxTimerPlugin {
  show(o: {
    id: number;
    title: string;
    text: string;
    baseMs: number;
    countDown: boolean;
    endTitle?: string;
    endText?: string;
  }): Promise<{ shown: boolean }>;
  hide(o: { id: number }): Promise<void>;
}

const Timer = registerPlugin<LennyxTimerPlugin>('LennyxTimer');

export const timerNativeSupported = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/**
 * Affiche un compte en avant (chronomètre).
 * @param startedAt instant de départ, en millisecondes epoch.
 */
export async function showCountUp(id: number, title: string, text: string, startedAt: number) {
  if (!timerNativeSupported()) return;
  try {
    await Timer.show({ id, title, text, baseMs: startedAt, countDown: false });
  } catch {
    /* notifications refusées : le minuteur reste juste, seul l'affichage manque */
  }
}

/**
 * Affiche un décompte (Pomodoro) et programme la sonnerie de fin de phase.
 * @param endsAt instant de fin, en millisecondes epoch.
 */
export async function showCountDown(
  id: number, title: string, text: string, endsAt: number,
  endTitle: string, endText: string,
) {
  if (!timerNativeSupported()) return;
  try {
    await Timer.show({ id, title, text, baseMs: endsAt, countDown: true, endTitle, endText });
  } catch {
    /* idem */
  }
}

export async function hideTimer(id: number) {
  if (!timerNativeSupported()) return;
  try {
    await Timer.hide({ id });
  } catch {
    /* non bloquant */
  }
}
