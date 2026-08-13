// ── Réconciliation des minuteurs ──────────────────────────────────────────
// Une phase de Pomodoro peut se terminer alors que Lennyx est fermé : Android
// sonne (alarme exacte posée par LennyxTimerPlugin), mais l'état du jeu, lui,
// doit être remis d'aplomb au retour. On le fait ici, au niveau de
// l'application, et non dans l'écran Outils : le Pomodoro accompli doit être
// crédité même si l'utilisateur rouvre l'app sur l'accueil.

import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { notifyNow } from '../lib/notify';
import { hideTimer, timerNativeSupported, TIMER_ID } from '../lib/timerBridge';

export function useTimers() {
  const settlePomodoro = useStore((s) => s.settlePomodoro);
  const soundOn = useStore((s) => s.profile.soundOn);

  useEffect(() => {
    const check = () => {
      const endsAt = useStore.getState().profile.timers.pomodoro.endsAt;
      if (endsAt === 0 || Date.now() < endsAt) return;
      // Est-ce que l'échéance vient de tomber sous nos yeux, ou est-elle vieille
      // de plusieurs minutes ? Dans le second cas, l'annonce serait un rappel
      // hors sujet — et sur Android, un doublon de la sonnerie déjà émise.
      const justPassed = Date.now() - endsAt < 5_000;
      const res = settlePomodoro();
      if (!res) return;
      void hideTimer(TIMER_ID.pomodoro);
      if (!justPassed || timerNativeSupported()) return;
      if (res.ended === 'work') {
        notifyNow(
          'celebrate', 'Pomodoro terminé',
          res.isLong ? 'Pause longue méritée.' : 'Petite pause, puis on repart.',
          soundOn,
        );
      } else {
        notifyNow('briefing', 'Pause terminée', 'Prêt pour une nouvelle session de travail ?', soundOn);
      }
    };
    check();
    const iv = setInterval(check, 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [settlePomodoro, soundOn]);
}
