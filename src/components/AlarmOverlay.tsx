// ── Réveil & berceuse : surveillance de l'heure + écran plein écran ───────
import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { isScheduledOn, todayStr, nowTimeStr } from '../game/engine';
import { playMelody, stopMelody, MELODIES } from '../lib/melodies';
import { Icon } from './Icon';

const FIRED_KEY = 'lennyx-alarm-fired';

function firedToday(kind: string): boolean {
  try {
    const data = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}');
    return data[`${todayStr()}|${kind}`] === true;
  } catch {
    return false;
  }
}

function markAlarmFired(kind: string) {
  try {
    const t = todayStr();
    const data = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}');
    const out: Record<string, boolean> = {};
    for (const k of Object.keys(data)) if (k.startsWith(t)) out[k] = data[k];
    out[`${t}|${kind}`] = true;
    localStorage.setItem(FIRED_KEY, JSON.stringify(out));
  } catch {
    /* non bloquant */
  }
}

export default function AlarmOverlay() {
  const alarms = useStore((s) => s.profile.alarms);
  const recordWake = useStore((s) => s.recordWake);
  const pushToast = useStore((s) => s.pushToast);
  const [active, setActive] = useState<'wake' | 'lullaby' | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState(0);
  const [clock, setClock] = useState(nowTimeStr());

  useEffect(() => {
    const check = () => {
      setClock(nowTimeStr());
      if (active) return;
      const t = todayStr();
      const now = nowTimeStr();
      const nowMs = Date.now();
      for (const kind of ['wake', 'lullaby'] as const) {
        const a = alarms[kind];
        if (!a.on || !isScheduledOn(a.days, t)) continue;
        const due = now >= a.time && now <= `${a.time.slice(0, 3)}${String(Math.min(59, Number(a.time.slice(3)) + 5)).padStart(2, '0')}`;
        const snoozed = kind === 'wake' && snoozeUntil > 0 && nowMs >= snoozeUntil;
        if ((due && !firedToday(kind)) || snoozed) {
          markAlarmFired(kind);
          setSnoozeUntil(0);
          setActive(kind);
          playMelody(a.melody, a.volume);
          if (kind === 'lullaby') {
            // la berceuse s'éteint seule après 20 minutes
            setTimeout(() => {
              stopMelody();
              setActive((cur) => (cur === 'lullaby' ? null : cur));
            }, 20 * 60_000);
          }
          break;
        }
      }
    };
    check();
    const iv = setInterval(check, 10_000);
    return () => clearInterval(iv);
  }, [alarms, active, snoozeUntil]);

  if (!active) return null;
  const isWake = active === 'wake';
  const melodyName =
    alarms[active].melody === 'custom'
      ? alarms.customAudioName ?? 'Fichier personnel'
      : MELODIES.find((m) => m.id === alarms[active].melody)?.name ?? '';

  const stop = () => {
    stopMelody();
    setActive(null);
    if (isWake) {
      recordWake();
      pushToast('sun', 'Réveil arrêté — bonne conquête !', 'info');
    }
  };

  const snooze = () => {
    stopMelody();
    setActive(null);
    setSnoozeUntil(Date.now() + 5 * 60_000);
    pushToast('moon', 'Encore 5 minutes… je reviens.', 'info');
  };

  return (
    <div className="overlay" style={{ zIndex: 120, flexDirection: 'column', gap: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <Icon name={isWake ? 'sun' : 'moon'} size={72} stroke={1.1} style={{ color: 'var(--gold)' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, letterSpacing: '0.1em', margin: '12px 0 4px' }}>
          {clock}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--gold)', letterSpacing: '0.15em' }}>
          {isWake ? 'DEBOUT, CONQUÉRANT' : 'L’HEURE DU REPOS'}
        </div>
        <div className="muted" style={{ marginTop: 8 }}>♪ {melodyName}</div>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        {isWake && (
          <button className="btn" style={{ padding: '14px 22px', fontSize: 15 }} onClick={snooze}>
            <Icon name="moon" size={16} /> +5 min
          </button>
        )}
        <button className="btn primary" style={{ padding: '14px 30px', fontSize: 16 }} onClick={stop}>
          <Icon name="check" size={17} /> {isWake ? 'Je suis debout' : 'Éteindre'}
        </button>
      </div>
    </div>
  );
}
