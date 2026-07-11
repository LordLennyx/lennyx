// ── Pont vers le widget natif Android (écran d'accueil) ───────────────────
// Plugin Capacitor local (aucune publication npm nécessaire) : le code natif
// vit dans android/app/src/main/java/com/lennyx/app/LennyxWidgetPlugin.java.

import { registerPlugin, Capacitor } from '@capacitor/core';

interface LennyxWidgetPlugin {
  update(options: {
    name: string;
    level: number;
    rank: string;
    xpPercent: number;
    stepsToday: number;
    stepsGoal: number;
    streak: number;
    pending: number;
    nextAlarm: string;
  }): Promise<void>;
}

const LennyxWidget = registerPlugin<LennyxWidgetPlugin>('LennyxWidget');

export function pushWidgetData(data: {
  name: string;
  level: number;
  rank: string;
  xpPercent: number;
  stepsToday: number;
  stepsGoal: number;
  streak: number;
  pending: number;
  nextAlarm: string;
}) {
  if (!Capacitor.isNativePlatform()) return;
  void LennyxWidget.update(data).catch(() => {
    /* le widget est un bonus, jamais bloquant */
  });
}
