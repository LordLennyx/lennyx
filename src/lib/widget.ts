// ── Pont vers le widget natif Android (écran d'accueil) ───────────────────
// Plugin Capacitor local (aucune publication npm nécessaire) : le code natif
// vit dans android/app/src/main/java/com/lennyx/app/LennyxWidgetPlugin.java.

import { registerPlugin, Capacitor } from '@capacitor/core';

export interface WidgetSnapshot {
  name: string;
  level: number;
  rank: string;
  xpPercent: number;
  stepsToday: number;
  stepsGoal: number;
  streak: number;
  pending: number;
  nextAlarm: string;
  /** Humeur de Lennyx : pilote le blason, le liseré et la teinte (v0.9). */
  mood: string;
  moodLine: string;
  nextTask: string;
  doneToday: number;
  totalToday: number;
}

interface LennyxWidgetPlugin {
  update(options: WidgetSnapshot): Promise<void>;
}

const LennyxWidget = registerPlugin<LennyxWidgetPlugin>('LennyxWidget');

export function pushWidgetData(data: WidgetSnapshot) {
  if (!Capacitor.isNativePlatform()) return;
  void LennyxWidget.update(data).catch(() => {
    /* le widget est un bonus, jamais bloquant */
  });
}
