// ── Podomètre iOS ─────────────────────────────────────────────────────────
// iOS enregistre les pas en continu dans son coprocesseur de mouvement et en
// garde l'historique sur sept jours. Aucun service, aucune notification
// permanente, aucune exemption de batterie à quémander : on interroge
// l'historique à l'ouverture et on récupère tout ce qui a été marché entre
// deux lancements.
//
// C'est la même promesse que sur Android, obtenue bien plus simplement — et
// sans rien coûter en batterie, puisque rien de Lennyx ne veille.

import { registerPlugin, Capacitor } from '@capacitor/core';

export type MotionAuth = 'granted' | 'denied' | 'restricted' | 'pending' | 'unknown';

interface LennyxPedometerPlugin {
  isAvailable(): Promise<{ available: boolean; authorization: MotionAuth }>;
  queryDays(options: { days: number }): Promise<{ days: Record<string, number>; available: boolean }>;
}

const Pedometer = registerPlugin<LennyxPedometerPlugin>('LennyxPedometer');

export const pedometerIOSSupported = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export async function iosPedometerStatus(): Promise<{ available: boolean; authorization: MotionAuth }> {
  if (!pedometerIOSSupported()) return { available: false, authorization: 'unknown' };
  try {
    return await Pedometer.isAvailable();
  } catch {
    return { available: false, authorization: 'unknown' };
  }
}

/**
 * Compteurs journaliers relevés par iOS (date locale `YYYY-MM-DD` → pas).
 * Sept jours au maximum : au-delà, le système ne conserve rien.
 */
export async function iosSteps(): Promise<Record<string, number>> {
  if (!pedometerIOSSupported()) return {};
  try {
    const { days } = await Pedometer.queryDays({ days: 7 });
    return days ?? {};
  } catch {
    return {};
  }
}
