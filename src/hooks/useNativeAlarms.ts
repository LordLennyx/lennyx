// ── Synchronisation des réveils avec Android ──────────────────────────────
// Le réglage vit dans le store ; Android doit en avoir une copie à jour, sinon
// il sonnerait sur d'anciens paramètres. On repousse donc la configuration
// complète à chaque modification — écrire deux entrées est assez peu coûteux
// pour se passer d'un calcul de différence, forcément plus fragile.

import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  alarmNativeSupported, configureAlarm, cancelAlarm, consumeNativeStops,
} from '../lib/alarmBridge';

export function useNativeAlarms() {
  const alarms = useStore((s) => s.profile.alarms);
  const recordWake = useStore((s) => s.recordWake);

  useEffect(() => {
    if (!alarmNativeSupported()) return;
    for (const kind of ['wake', 'lullaby'] as const) {
      const a = alarms[kind];
      if (!a.on) {
        void cancelAlarm(kind);
        continue;
      }
      void configureAlarm({
        kind,
        on: true,
        time: a.time,
        days: a.days,
        label: a.label ?? '',
        repeatMin: a.repeatMin ?? (kind === 'wake' ? 5 : 0),
        volume: a.volume,
        audioPath: a.audio?.nativePath,
        startMs: a.audio?.startMs ?? 0,
        endMs: a.audio?.endMs ?? 0,
        imagePath: a.image?.nativePath,
      });
    }
  }, [alarms]);

  // Un réveil arrêté depuis l'écran natif alors que Lennyx était fermé doit
  // quand même figurer au journal : on récupère l'heure au lancement suivant.
  useEffect(() => {
    if (!alarmNativeSupported()) return;
    let alive = true;
    const pull = async () => {
      const stops = await consumeNativeStops();
      if (!alive || !stops.wake) return;
      recordWake(stops.wake.time, stops.wake.date);
    };
    void pull();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pull();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [recordWake]);
}
