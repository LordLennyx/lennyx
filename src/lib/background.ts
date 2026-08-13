// ── Présence permanente de Lennyx sur le téléphone ────────────────────────
// Pont vers le service Android de premier plan : il compte les pas avec le
// capteur MATÉRIEL (qui fonctionne écran éteint et application fermée) et
// survit au redémarrage du téléphone.
//
// Sur Windows/web, ce module est inerte : le comptage repose alors sur
// l'accéléromètre, forcément limité à l'application ouverte.

import { registerPlugin, Capacitor } from '@capacitor/core';

/** Capteur employé pour compter : par ordre de fiabilité décroissante. */
export type StepSensor = 'counter' | 'detector' | 'accel' | 'none';

export interface BackgroundStatus {
  enabled: boolean; // le service a été démarré
  permission: boolean; // ACTIVITY_RECOGNITION accordée
  hasStepSensor: boolean; // le téléphone sait compter des pas d'une façon ou d'une autre
  available: StepSensor; // le meilleur capteur que possède ce téléphone
  sensor: StepSensor; // celui que le service utilise réellement
  lastUpdate: number; // horodatage du dernier relevé de pas
  heartbeat: number; // dernier signe de vie du service, même sans nouveau pas
  batteryExempt: boolean; // exempté des mises en veille du constructeur
}

interface LennyxBackgroundPlugin {
  start(options: { offsetToday?: number }): Promise<{ running: boolean; denied?: boolean }>;
  stop(): Promise<{ running: boolean }>;
  status(): Promise<BackgroundStatus>;
  requestBatteryExemption(): Promise<{ granted: boolean }>;
  getSteps(): Promise<{ days: Record<string, number> }>;
  catchUp(): Promise<{ caughtUp: boolean; stepsToday?: number; added?: number; timedOut?: boolean }>;
  journal(): Promise<{ log: string }>;
}

const Background = registerPlugin<LennyxBackgroundPlugin>('LennyxBackground');

export const backgroundSupported = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/**
 * Démarre le service. `offsetToday` transmet les pas déjà comptés aujourd'hui :
 * le service en tient compte au lieu de repartir de zéro, sinon le compteur
 * resterait figé le temps qu'il rattrape l'accéléromètre.
 */
export async function startBackground(offsetToday = 0): Promise<{ running: boolean; denied?: boolean }> {
  if (!backgroundSupported()) return { running: false };
  try {
    return await Background.start({ offsetToday: Math.max(0, Math.round(offsetToday)) });
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
  enabled: false, permission: false, hasStepSensor: false, available: 'none',
  sensor: 'none', lastUpdate: 0, heartbeat: 0, batteryExempt: false,
};

/**
 * Demande l'exemption d'optimisation de batterie. Sans elle, les surcouches
 * constructeur (One UI en particulier) endorment l'application et le service
 * meurt dès l'écran éteint — le comptage s'arrête alors sans rien signaler.
 */
export async function requestBatteryExemption(): Promise<boolean> {
  if (!backgroundSupported()) return false;
  try {
    const { granted } = await Background.requestBatteryExemption();
    return granted;
  } catch {
    return false;
  }
}

export async function backgroundStatus(): Promise<BackgroundStatus> {
  if (!backgroundSupported()) return OFFLINE_STATUS;
  try {
    const st = await Background.status();
    return { ...OFFLINE_STATUS, ...st };
  } catch {
    return OFFLINE_STATUS;
  }
}

/** Nom lisible du capteur, pour le diagnostic affiché à l'utilisateur. */
export function sensorLabel(s: StepSensor): string {
  switch (s) {
    case 'counter': return 'podomètre matériel';
    case 'detector': return 'détecteur de pas matériel';
    case 'accel': return 'accéléromètre (repli)';
    default: return 'aucun';
  }
}

/**
 * Rattrape les pas faits application fermée, en relisant le compteur MATÉRIEL.
 *
 * À appeler à chaque retour dans l'application, avant `nativeSteps()`. C'est ce
 * qui rend le comptage indépendant de la survie du service : le compteur du
 * téléphone accumule tout seul depuis le dernier démarrage, donc même si
 * Android a tué le service — ce que font volontiers les surcouches
 * constructeur — rien n'est perdu, il suffit de relire.
 */
export async function catchUpSteps(): Promise<number> {
  if (!backgroundSupported()) return 0;
  try {
    const res = await Background.catchUp();
    return res.added ?? 0;
  } catch {
    return 0;
  }
}

/** Journal du service : des faits datés plutôt que des suppositions. */
export async function stepJournal(): Promise<string> {
  if (!backgroundSupported()) return '';
  try {
    const { log } = await Background.journal();
    return log ?? '';
  } catch {
    return '';
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
