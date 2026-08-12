// ── Présence permanente de Lennyx sur le téléphone ────────────────────────
// Pont vers le service Android de premier plan : il compte les pas avec le
// capteur MATÉRIEL (qui fonctionne écran éteint et application fermée) et
// survit au redémarrage du téléphone.
//
// Sur Windows/web, ce module est inerte : le comptage repose alors sur
// l'accéléromètre, forcément limité à l'application ouverte.

import { registerPlugin, Capacitor } from '@capacitor/core';

interface LennyxBackgroundPlugin {
  start(): Promise<{ running: boolean; denied?: boolean }>;
  stop(): Promise<{ running: boolean }>;
  status(): Promise<{ enabled: boolean; permission: boolean; lastUpdate: number }>;
  getSteps(): Promise<{ days: Record<string, number> }>;
}

const Background = registerPlugin<LennyxBackgroundPlugin>('LennyxBackground');

export const backgroundSupported = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export async function startBackground(): Promise<{ running: boolean; denied?: boolean }> {
  if (!backgroundSupported()) return { running: false };
  try {
    return await Background.start();
  } catch {
    return { running: false };
  }
}

export async function stopBackground(): Promise<void> {
  if (!backgroundSupported()) return;
  try {
    await Background.stop();
  } catch {
    /* non bloquant */
  }
}

export async function backgroundStatus(): Promise<{ enabled: boolean; permission: boolean; lastUpdate: number }> {
  if (!backgroundSupported()) return { enabled: false, permission: false, lastUpdate: 0 };
  try {
    return await Background.status();
  } catch {
    return { enabled: false, permission: false, lastUpdate: 0 };
  }
}

/** Compteurs journaliers accumulés en arrière-plan (date → pas). */
export async function nativeSteps(): Promise<Record<string, number>> {
  if (!backgroundSupported()) return {};
  try {
    const { days } = await Background.getSteps();
    return days ?? {};
  } catch {
    return {};
  }
}
