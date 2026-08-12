// ── Planificateur de notifications ────────────────────────────────────────
// Au premier plan (Electron/Web/Android ouvert) : vérification toutes les 20 s
// avec anti-doublon persistant. Sur Android : reprogrammation native pour que
// les rappels sonnent même application fermée.
//
// L'escalade est calculée AU MILLIMÈTRE : le nombre et la position des rappels
// dépendent de trois facteurs — la difficulté de la tâche (une épique mérite
// qu'on s'y prenne à l'avance), le temps restant (plus c'est proche, plus c'est
// dense) et l'intensité choisie (discret / normal / duolingo).

import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { isScheduledOn, todayStr, addDays, nowTimeStr } from '../game/engine';
import {
  alreadyFired, markFired, notifyNow, rescheduleNative, isNative, type ScheduledItem,
} from '../lib/notify';
import {
  sentinelMsg, middayMsg, guiltMsg, briefingMsg, lastcallMsg, reminderMsg, urgentMsg,
  afterMsg, questDeadlineMsg, hourlyNagMsg, midnightMsg, type Intensity,
} from '../lib/nudges';
import {
  AFTER_OFFSETS, QUEST_DAY_OFFSETS, offsetsFor, kindForRemaining, minutesOf, hhmmOf, numId,
} from '../lib/schedule';

function atDate(dateStr: string, hhmm: string): Date {
  return new Date(`${dateStr}T${hhmm}:00`);
}

export function useNotifications() {
  const dailies = useStore((s) => s.dailies);
  const quests = useStore((s) => s.quests);
  const notify = useStore((s) => s.profile.notify);
  const alarms = useStore((s) => s.profile.alarms);
  const soundOn = useStore((s) => s.profile.soundOn);
  const pushToast = useStore((s) => s.pushToast);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  /**
   * Sur Android, les mêmes rappels sont DÉJÀ programmés nativement (ils doivent
   * sonner application fermée). Les redéclencher ici les afficherait en double :
   * on se contente donc d'un signal dans l'application, et on laisse le système
   * faire le reste.
   */
  const alert = (
    kind: Parameters<typeof notifyNow>[0],
    title: string,
    body: string,
    toastIcon?: string,
  ) => {
    if (isNative()) {
      if (toastIcon) pushToast(toastIcon, body, 'warn');
      return;
    }
    notifyNow(kind, title, body, soundRef.current);
  };

  // ── premier plan : vérification serrée ──────────────────────────────────
  useEffect(() => {
    if (!notify.enabled) return;

    const check = () => {
      const st = useStore.getState();
      const t = todayStr();
      const now = nowTimeStr();
      const nowMin = minutesOf(now);
      const intensity = notify.intensity as Intensity;
      const due = dailies.filter((d) => isScheduledOn(d.days, t) && d.lastCompletedDate !== t);
      const streak = st.profile.currentStreak;
      const nothingToday = st.profile.lastComboDate !== t;

      // ── tâches chronométrées : escalade complète ──
      for (const d of due) {
        if (!d.timeLimit) continue;
        const limitMin = minutesOf(d.timeLimit);
        const remaining = limitMin - nowMin;

        for (const offset of offsetsFor(d.difficulty, intensity)) {
          if (offset === 0) continue; // traité par le dernier appel ci-dessous
          const key = `${t}|rem${offset}|${d.id}`;
          // fenêtre de tir d'une minute autour du palier
          if (remaining <= offset && remaining > offset - 1 && !alreadyFired(key)) {
            markFired(key);
            const kind = kindForRemaining(remaining);
            const body = kind === 'urgent'
              ? urgentMsg(intensity, d.title, remaining, d.timeLimit, d.streak)
              : reminderMsg(intensity, d.title, remaining, d.timeLimit, d.difficulty, d.streak);
            alert(kind, d.title, body, 'clock');
          }
        }

        // heure limite atteinte
        if (notify.lastCall) {
          const key = `${t}|last|${d.id}`;
          if (remaining <= 0 && remaining > -1 && !alreadyFired(key)) {
            markFired(key);
            alert('lastcall', `« ${d.title} »`, lastcallMsg(intensity, d.title, d.timeLimit), 'clock');
          }
        }

        // relances après coup, tant que ce n'est pas fait
        for (const after of AFTER_OFFSETS[intensity]) {
          const key = `${t}|after${after}|${d.id}`;
          const late = -remaining;
          if (late >= after && late < after + 1 && !alreadyFired(key)) {
            markFired(key);
            alert('nag', 'Toujours en attente', afterMsg(late, d.title), 'warning');
          }
        }
      }

      // ── quêtes à échéance ──
      for (const q of quests) {
        if (q.completedAt || !q.deadline) continue;
        const daysLeft = Math.round(
          (new Date(`${q.deadline}T12:00:00`).getTime() - new Date(`${t}T12:00:00`).getTime()) / 86400000,
        );
        if (!QUEST_DAY_OFFSETS[intensity].includes(daysLeft)) continue;
        const key = `${t}|quest|${q.id}`;
        if (now >= '09:00' && !alreadyFired(key)) {
          markFired(key);
          alert(
            daysLeft <= 0 ? 'urgent' : 'reminder',
            daysLeft < 0 ? 'Quête en retard' : 'Échéance de quête',
            questDeadlineMsg(intensity, q.title, daysLeft),
            'hourglass',
          );
        }
      }

      // briefing du matin
      if (notify.briefingTime) {
        const key = `${t}|brief`;
        const briefMin = minutesOf(notify.briefingTime);
        if (nowMin >= briefMin && nowMin < briefMin + 60 && !alreadyFired(key)) {
          markFired(key);
          const timed = due.filter((d) => d.timeLimit).length;
          alert('briefing', 'Ton programme du jour', briefingMsg(intensity, due.length, timed));
        }
      }

      // mode duolingo : relance à chaque heure pleine si des tâches traînent
      if (intensity === 'duolingo' && due.length > 0) {
        const hour = Math.floor(nowMin / 60);
        if (hour >= 8 && hour <= 22) {
          const key = `${t}|hour${hour}`;
          if (nowMin % 60 < 1 && !alreadyFired(key)) {
            markFired(key);
            alert('nag', 'L’Oracle veille', hourlyNagMsg(hour, due.length, streak));
          }
        }
      }

      // mode duolingo : relance de midi + culpabilisation d'après-midi si journée vide
      if (intensity === 'duolingo' && nothingToday) {
        const keyNoon = `${t}|noon`;
        if (now >= '12:30' && now < '14:00' && !alreadyFired(keyNoon)) {
          markFired(keyNoon);
          alert('nag', 'Toujours rien ?', middayMsg(streak));
        }
        const keyGuilt = `${t}|guilt`;
        if (now >= '16:30' && now < '18:00' && !alreadyFired(keyGuilt)) {
          markFired(keyGuilt);
          alert('nag', 'L’Oracle insiste', guiltMsg(streak));
        }
      }

      // sentinelle du soir
      if (notify.sentinelTime && due.length > 0) {
        const key = `${t}|sent`;
        if (now >= notify.sentinelTime && !alreadyFired(key)) {
          markFired(key);
          const titles = due.slice(0, 3).map((d) => d.title).join(', ') + (due.length > 3 ? '…' : '');
          alert('sentinel', 'Tes streaks sont en jeu', sentinelMsg(intensity, due.length, streak, titles), 'eye');
        }
        if (intensity === 'duolingo') {
          const key2 = `${t}|sent2`;
          const later = hhmmOf(minutesOf(notify.sentinelTime) + 75);
          if (now >= later && !alreadyFired(key2)) {
            markFired(key2);
            const titles = due.slice(0, 2).map((d) => d.title).join(', ');
            alert('sentinel', 'Dernière chance', sentinelMsg('duolingo', due.length, streak, titles), 'eye');
          }
        }
      }

      // ultime avertissement avant minuit : le streak global se joue là.
      // 23h30 et non 23h00 : les routines de coucher ont souvent 23h00 pour
      // limite, on éviterait sinon deux notifications à la même minute.
      if (intensity !== 'discret' && (due.length > 0 || nothingToday)) {
        const key = `${t}|midnight`;
        if (now >= '23:30' && !alreadyFired(key)) {
          markFired(key);
          alert('urgent', 'Minuit approche', midnightMsg(due.length, streak, nothingToday), 'flame');
        }
      }
    };

    check();
    const iv = setInterval(check, 20_000);
    return () => clearInterval(iv);
  }, [dailies, quests, notify, pushToast]);

  // ── Android : programmation native (application fermée) ─────────────────
  useEffect(() => {
    if (!isNative()) return;
    if (!notify.enabled) {
      void rescheduleNative([]);
      return;
    }
    const items: ScheduledItem[] = [];
    const today = todayStr();
    const now = new Date();
    const intensity = notify.intensity as Intensity;
    const duo = intensity === 'duolingo';
    // trois jours d'avance : même sans ouvrir l'app de tout un week-end,
    // les rappels continuent de tomber
    const horizon = [today, addDays(today, 1), addDays(today, 2)];

    for (const day of horizon) {
      const isToday = day === today;

      for (const d of dailies) {
        if (!isScheduledOn(d.days, day)) continue;
        if (isToday && d.lastCompletedDate === today) continue;
        if (!d.timeLimit) continue;
        const limitMin = minutesOf(d.timeLimit);

        for (const offset of offsetsFor(d.difficulty, intensity)) {
          if (offset === 0) continue;
          const at = atDate(day, hhmmOf(limitMin - offset));
          if (at <= now) continue;
          const kind = kindForRemaining(offset);
          items.push({
            id: numId(`${day}|rem${offset}|${d.id}`),
            kind,
            title: d.title,
            body: kind === 'urgent'
              ? urgentMsg(intensity, d.title, offset, d.timeLimit, d.streak)
              : reminderMsg(intensity, d.title, offset, d.timeLimit, d.difficulty, d.streak),
            at,
          });
        }

        if (notify.lastCall) {
          const at = atDate(day, d.timeLimit);
          if (at > now)
            items.push({
              id: numId(`${day}|last|${d.id}`),
              kind: 'lastcall',
              title: `Fenêtre manquée : ${d.title}`,
              body: lastcallMsg(intensity, d.title, d.timeLimit),
              at,
            });
        }

        for (const after of AFTER_OFFSETS[intensity]) {
          const at = atDate(day, hhmmOf(limitMin + after));
          if (at > now)
            items.push({
              id: numId(`${day}|after${after}|${d.id}`),
              kind: 'nag',
              title: 'Toujours en attente',
              body: afterMsg(after, d.title),
              at,
            });
        }
      }

      // quotidiennes sans heure limite : un rappel unique en fin d'après-midi
      const looseDailies = dailies.filter(
        (d) => !d.timeLimit && isScheduledOn(d.days, day) && !(isToday && d.lastCompletedDate === today),
      );
      if (looseDailies.length > 0 && intensity !== 'discret') {
        const at = atDate(day, '17:30');
        if (at > now)
          items.push({
            id: numId(`${day}|loose`),
            kind: 'reminder',
            title: `${looseDailies.length} routine(s) à faire`,
            body: looseDailies.slice(0, 3).map((d) => d.title).join(', '),
            at,
          });
      }

      if (notify.briefingTime) {
        const at = atDate(day, notify.briefingTime);
        if (at > now) {
          const dueThatDay = dailies.filter((d) => isScheduledOn(d.days, day)).length;
          items.push({
            id: numId(`${day}|brief`),
            kind: 'briefing',
            title: 'Lennyx — programme du jour',
            body: briefingMsg(intensity, dueThatDay, dailies.filter((d) => d.timeLimit && isScheduledOn(d.days, day)).length),
            at,
          });
        }
      }

      if (duo) {
        // relances horaires : le harcèlement bienveillant, même app fermée
        for (const h of [10, 12, 14, 16, 18, 20]) {
          const at = atDate(day, `${String(h).padStart(2, '0')}:00`);
          if (at <= now) continue;
          const pending = dailies.filter(
            (d) => isScheduledOn(d.days, day) && !(isToday && d.lastCompletedDate === today),
          ).length;
          if (pending === 0) continue;
          items.push({
            id: numId(`${day}|hour${h}`),
            kind: 'nag',
            title: 'L’Oracle veille',
            body: hourlyNagMsg(h, pending, 0),
            at,
          });
        }
      }

      if (notify.sentinelTime) {
        const dueThatDay = dailies.filter(
          (d) => isScheduledOn(d.days, day) && !(isToday && d.lastCompletedDate === today),
        );
        if (dueThatDay.length > 0) {
          const at = atDate(day, notify.sentinelTime);
          if (at > now)
            items.push({
              id: numId(`${day}|sent`),
              kind: 'sentinel',
              title: 'Sentinelle du soir',
              body: sentinelMsg(intensity, dueThatDay.length, 0, dueThatDay.slice(0, 3).map((d) => d.title).join(', ')),
              at,
            });
          if (duo) {
            const at2 = atDate(day, '23:30');
            if (at2 > now)
              items.push({
                id: numId(`${day}|midnight`),
                kind: 'urgent',
                title: 'Minuit approche',
                body: midnightMsg(dueThatDay.length, 0, false),
                at: at2,
              });
          }
        }
      }

      // alarmes : réveil et berceuse, même application fermée
      for (const kind of ['wake', 'lullaby'] as const) {
        const a = alarms[kind];
        if (!a.on || !isScheduledOn(a.days, day)) continue;
        const at = atDate(day, a.time);
        if (at > now)
          items.push({
            id: numId(`${day}|alarm|${kind}`),
            kind: kind === 'wake' ? 'urgent' : 'briefing',
            title: kind === 'wake' ? 'Réveil Lennyx' : 'Berceuse Lennyx',
            body: kind === 'wake' ? 'Debout ! Ouvre Lennyx pour arrêter la sonnerie.' : 'Il est l’heure de préparer ta nuit.',
            at,
          });
      }
    }

    // échéances de quêtes (sur tout l'horizon connu)
    for (const q of quests) {
      if (q.completedAt || !q.deadline) continue;
      for (const off of QUEST_DAY_OFFSETS[intensity]) {
        const day = addDays(q.deadline, -off);
        const at = atDate(day, '09:00');
        if (at <= now) continue;
        items.push({
          id: numId(`${day}|quest${off}|${q.id}`),
          kind: off <= 0 ? 'urgent' : 'reminder',
          title: off < 0 ? 'Quête en retard' : 'Échéance de quête',
          body: questDeadlineMsg(intensity, q.title, off),
          at,
        });
      }
    }

    void rescheduleNative(items);
  }, [dailies, quests, notify, alarms]);
}
