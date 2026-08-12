// ── Présence permanente de Lennyx sur le téléphone ────────────────────────
// Pont vers le service Android de premier plan : il compte les pas avec le
// capteur MATÉRIEL (qui fonctionne écran éteint et application fermée) et
// survit au redémarrage du téléphone.
//
// Sur Windows/web, ce module est inerte : le comptage repose alors sur
// l'accéléromètre, forcément limité à l'application ouverte.

import { registerPlugin, Capacitor } from '@capacitor/core';

export interface BackgroundStatus {
  enabled: boolean; // le service a été démarré
  permission: boolean; // ACTIVITY_RECOGNITION accordée
  hasStepSensor: boolean; // le téléphone possède un podomètre matériel
  lastUpdate: number; // horodatage du dernier relevé de pas
}

interface LennyxBackgroundPlugin {
  start(): Promise<{ running: boolean; denied?: boolean }>;
  stop(): Promise<{ running: boolean }>;
  status(): Promise<BackgroundStatus>;
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

const OFFLINE_STATUS: BackgroundStatus = {
  enabled: false, permission: false, hasStepSensor: false, lastUpdate: 0,
};

export async function backgroundStatus(): Promise<BackgroundStatus> {
  if (!backgroundSupported()) return OFFLINE_STATUS;
  try {
    const st = await Background.status();
    return { ...OFFLINE_STATUS, ...st };
  } catch {
    return OFFLINE_STATUS;
  }
}

/**
 * Le service natif compte-t-il RÉELLEMENT les pas en ce moment ?
 * Tant que ce n'est pas le cas (présence coupée, permission refusée, ou
 * téléphone sans podomètre matériel), l'accéléromètre doit reprendre la main —
 * sinon plus rien n'est compté du tout.
 */
export async function nativeCountingActive(): Promise<boolean> {
  if (!backgroundSupported()) return false;
  const st = await backgroundStatus();
  return st.enabled && st.permission && st.hasStepSensor;
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
