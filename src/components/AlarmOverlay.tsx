// ── Réveil & berceuse : surveillance de l'heure + écran plein écran ───────
//
// ⚠ Cet overlay est le réveil de Windows et du web UNIQUEMENT. Sur Android,
// c'est LennyxAlarmActivity qui s'en charge : elle s'affiche par-dessus l'écran
// de verrouillage, avec l'image et l'extrait choisis, même application fermée.
// Laisser les deux tourner ferait sonner le réveil en double dès que Lennyx
// serait ouvert à l'heure dite.
import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { isScheduledOn, todayStr, nowTimeStr } from '../game/engine';
import { playMelody, playSegment, stopMelody, MELODIES } from '../lib/melodies';
import { alarmNativeSupported } from '../lib/alarmBridge';
import { getMedia, type MediaKey } from '../lib/mediaStore';
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

/**
 * L'extrait personnel prime sur les mélodies synthétisées : c'est ce que
 * l'utilisateur a choisi, et c'est ce qu'Android jouerait de son côté.
 */
async function startSound(kind: 'wake' | 'lullaby', a: { melody: string; volume: number; audio?: { startMs: number; endMs: number } }) {
  if (a.audio) {
    const blob = await getMedia(`${kind}-audio` as MediaKey);
    if (blob) {
      playSegment(blob, a.audio.startMs, a.audio.endMs, a.volume);
      return;
    }
  }
  playMelody(a.melody, a.volume);
}

export default function AlarmOverlay() {
  const alarms = useStore((s) => s.profile.alarms);
  const recordWake = useStore((s) => s.recordWake);
  const pushToast = useStore((s) => s.pushToast);
  const [active, setActive] = useState<'wake' | 'lullaby' | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState(0);
  const [clock, setClock] = useState(nowTimeStr());
  const [bgUrl, setBgUrl] = useState<string | null>(null);

  // Le fond n'est chargé qu'au déclenchement : inutile de garder une image en
  // mémoire toute la journée pour un réveil de quelques minutes.
  useEffect(() => {
    if (!active) {
      setBgUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
      return;
    }
    let url: string | null = null;
    void (async () => {
      const blob = await getMedia(`${active}-image` as MediaKey);
      if (blob) {
        url = URL.createObjectURL(blob);
        setBgUrl(url);
      }
    })();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [active]);

  useEffect(() => {
    if (alarmNativeSupported()) return; // Android a son propre écran de réveil
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
          void startSound(kind, a);
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
    alarms[active].audio?.name
    ?? (alarms[active].melody === 'custom'
      ? alarms.customAudioName ?? 'Fichier personnel'
      : MELODIES.find((m) => m.id === alarms[active].melody)?.name ?? '');

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
    <div
      className="overlay"
      style={{
        zIndex: 120, flexDirection: 'column', gap: 24,
        // Le fond choisi par l'utilisateur, voilé pour garder l'heure lisible.
        ...(bgUrl
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.78), rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.88)), url(${bgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}),
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {!bgUrl && <Icon name={isWake ? 'sun' : 'moon'} size={72} stroke={1.1} style={{ color: 'var(--gold)' }} />}
        {bgUrl && (
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.42em', color: 'var(--gold)', marginBottom: 10 }}>
            LENNYX
          </div>
        )}
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
