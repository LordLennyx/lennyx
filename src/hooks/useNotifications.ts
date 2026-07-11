// ── Planificateur de notifications ────────────────────────────────────────
// Au premier plan (Electron/Web/Android ouvert) : vérification toutes les 30 s
// avec anti-doublon persistant. Sur Android : reprogrammation native pour que
// les rappels sonnent même application fermée.
// L'intensité (discret / normal / duolingo) module le ton ET la fréquence.

import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { isScheduledOn, todayStr, addDays, nowTimeStr } from '../game/engine';
import {
  alreadyFired, markFired, notifyNow, rescheduleNative, isNative, type ScheduledItem,
} from '../lib/notify';
import { sentinelMsg, middayMsg, guiltMsg, briefingMsg, lastcallMsg } from '../lib/nudges';

function minusMinutes(hhmm: string, n: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.max(0, h * 60 + m - n);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function atDate(dateStr: string, hhmm: string): Date {
  return new Date(`${dateStr}T${hhmm}:00`);
}

function numId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2000000000;
}

export function useNotifications() {
  const dailies = useStore((s) => s.dailies);
  const notify = useStore((s) => s.profile.notify);
  const alarms = useStore((s) => s.profile.alarms);
  const soundOn = useStore((s) => s.profile.soundOn);
  const pushToast = useStore((s) => s.pushToast);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  // ── premier plan : vérification périodique ──────────────────────────────
  useEffect(() => {
    if (!notify.enabled) return;

    const check = () => {
      const st = useStore.getState();
      const t = todayStr();
      const now = nowTimeStr();
      const intensity = notify.intensity;
      const due = dailies.filter((d) => isScheduledOn(d.days, t) && d.lastCompletedDate !== t);
      const streak = st.profile.currentStreak;
      const nothingToday = st.profile.lastComboDate !== t;

      // rappels des chronométrées
      for (const d of due) {
        if (!d.timeLimit) continue;
        if (notify.lead > 0) {
          const remindAt = minusMinutes(d.timeLimit, notify.lead);
          const key = `${t}|rem|${d.id}`;
          if (now >= remindAt && now < d.timeLimit && !alreadyFired(key)) {
            markFired(key);
            notifyNow('reminder', d.title, `À valider avant ${d.timeLimit} — il te reste ${notify.lead} min ou moins.`, soundRef.current);
            pushToast('clock', `Rappel : « ${d.title} » avant ${d.timeLimit}`, 'warn');
          }
        }
        if (notify.lastCall) {
          const key = `${t}|last|${d.id}`;
          if (now >= d.timeLimit && !alreadyFired(key)) {
            markFired(key);
            notifyNow('lastcall', `« ${d.title} »`, lastcallMsg(intensity, d.title, d.timeLimit), soundRef.current);
          }
        }
      }

      // briefing du matin
      if (notify.briefingTime) {
        const key = `${t}|brief`;
        if (now >= notify.briefingTime && now < minusMinutes(notify.briefingTime, -60) && !alreadyFired(key)) {
          markFired(key);
          const timed = due.filter((d) => d.timeLimit).length;
          notifyNow('briefing', 'Ton programme du jour', briefingMsg(intensity, due.length, timed), soundRef.current);
        }
      }

      // mode duolingo : relance de midi + culpabilisation d'après-midi
      if (intensity === 'duolingo' && nothingToday) {
        const keyNoon = `${t}|noon`;
        if (now >= '12:30' && now < '14:00' && !alreadyFired(keyNoon)) {
          markFired(keyNoon);
          notifyNow('sentinel', 'Toujours rien ?', middayMsg(streak), soundRef.current);
        }
        const keyGuilt = `${t}|guilt`;
        if (now >= '16:30' && now < '18:00' && !alreadyFired(keyGuilt)) {
          markFired(keyGuilt);
          notifyNow('sentinel', 'L’Oracle insiste', guiltMsg(streak), soundRef.current);
        }
      }

      // sentinelle du soir
      if (notify.sentinelTime && due.length > 0) {
        const key = `${t}|sent`;
        if (now >= notify.sentinelTime && !alreadyFired(key)) {
          markFired(key);
          const titles = due.slice(0, 3).map((d) => d.title).join(', ') + (due.length > 3 ? '…' : '');
          notifyNow('sentinel', 'Tes streaks sont en jeu', sentinelMsg(intensity, due.length, streak, titles), soundRef.current);
        }
        // duolingo : seconde salve une heure plus tard
        if (intensity === 'duolingo') {
          const key2 = `${t}|sent2`;
          const later = minusMinutes(notify.sentinelTime, -75);
          if (now >= later && !alreadyFired(key2)) {
            markFired(key2);
            const titles = due.slice(0, 2).map((d) => d.title).join(', ');
            notifyNow('sentinel', 'Dernière chance', sentinelMsg('duolingo', due.length, streak, titles), soundRef.current);
          }
        }
      }
    };

    check();
    const iv = setInterval(check, 30_000);
    return () => clearInterval(iv);
  }, [dailies, notify, pushToast]);

  // ── Android : programmation native (app fermée) ─────────────────────────
  useEffect(() => {
    if (!isNative()) return;
    if (!notify.enabled) {
      void rescheduleNative([]);
      return;
    }
    const items: ScheduledItem[] = [];
    const today = todayStr();
    const tomorrow = addDays(today, 1);
    const now = new Date();
    const duo = notify.intensity === 'duolingo';

    for (const day of [today, tomorrow]) {
      for (const d of dailies) {
        if (!d.timeLimit || !isScheduledOn(d.days, day)) continue;
        if (day === today && d.lastCompletedDate === today) continue;
        if (notify.lead > 0) {
          const at = atDate(day, minusMinutes(d.timeLimit, notify.lead));
          if (at > now)
            items.push({
              id: numId(`${day}|rem|${d.id}`), kind: 'reminder', title: d.title,
              body: `À valider avant ${d.timeLimit}.`, at,
            });
        }
        if (notify.lastCall) {
          const at = atDate(day, d.timeLimit);
          if (at > now)
            items.push({
              id: numId(`${day}|last|${d.id}`), kind: 'lastcall',
              title: `Dernière minute : ${d.title}`,
              body: `C'est maintenant ou le streak se brise (${d.timeLimit}).`, at,
            });
        }
      }
      if (notify.briefingTime) {
        const at = atDate(day, notify.briefingTime);
        if (at > now)
          items.push({
            id: numId(`${day}|brief`), kind: 'briefing', title: 'Lennyx — programme du jour',
            body: duo ? 'Debout. Tes quêtes ne s’accompliront pas toutes seules.' : 'Ouvre ton journal : tes quêtes t’attendent.',
            at,
          });
      }
      if (duo) {
        const at = atDate(day, '12:30');
        if (at > now)
          items.push({
            id: numId(`${day}|noon`), kind: 'sentinel', title: 'Point de midi',
            body: 'La moitié de la journée est passée. Et toi, où en es-tu ?', at,
          });
      }
      if (notify.sentinelTime) {
        const dueThatDay = dailies.filter(
          (d) => isScheduledOn(d.days, day) && (day !== today || d.lastCompletedDate !== today),
        );
        if (dueThatDay.length > 0) {
          const at = atDate(day, notify.sentinelTime);
          if (at > now)
            items.push({
              id: numId(`${day}|sent`), kind: 'sentinel', title: 'Sentinelle du soir',
              body: duo
                ? 'Tes streaks retiennent leur souffle. Ne les déçois pas.'
                : 'Des quotidiennes attendent encore — protège tes streaks.',
              at,
            });
        }
      }
      // alarmes : la notification native réveille même app fermée ;
      // ouvrir Lennyx déclenche alors la mélodie plein écran
      for (const kind of ['wake', 'lullaby'] as const) {
        const a = alarms[kind];
        if (!a.on || !isScheduledOn(a.days, day)) continue;
        const at = atDate(day, a.time);
        if (at > now)
          items.push({
            id: numId(`${day}|alarm|${kind}`),
            kind: kind === 'wake' ? 'lastcall' : 'briefing',
            title: kind === 'wake' ? '⏰ Réveil Lennyx' : 'Berceuse Lennyx',
            body: kind === 'wake' ? 'Debout ! Ouvre Lennyx pour arrêter la sonnerie.' : 'Il est l’heure de préparer ta nuit.',
            at,
          });
      }
    }
    void rescheduleNative(items);
  }, [dailies, notify, alarms]);
}
