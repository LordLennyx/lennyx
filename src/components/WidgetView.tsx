// ── Vue widget : fenêtre flottante compacte (Windows) ─────────────────────
// Lit directement le localStorage (lecture seule, aucune écriture) pour ne
// jamais entrer en conflit avec l'instance de store de la fenêtre principale.
// Un clic ouvre/remet au premier plan la fenêtre principale.

import { useEffect, useState } from 'react';
import Logo from './Logo';
import { Icon } from './Icon';
import { todayStr, isScheduledOn } from '../game/engine';
import { levelFromXp } from '../game/xp';

interface WidgetBridge {
  toggle: () => Promise<boolean>;
  openApp: () => void;
  hide: () => void;
}

declare global {
  interface Window {
    lennyxWidget?: WidgetBridge;
  }
}

interface Snapshot {
  name: string;
  level: number;
  streak: number;
  stepsToday: number;
  stepsGoal: number;
  nextAlarm: string | null;
}

function readSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem('lennyx-save');
    if (!raw) return null;
    const data = JSON.parse(raw);
    const p = data.state?.profile;
    if (!p) return null;
    const t = todayStr();
    const stepsToday = (p.steps?.counted?.[t] ?? 0) + (p.steps?.manual?.[t] ?? 0);
    let nextAlarm: string | null = null;
    if (p.alarms?.wake?.on && isScheduledOn(p.alarms.wake.days ?? [], t)) nextAlarm = p.alarms.wake.time;
    return {
      name: p.name ?? 'Aventurier',
      level: levelFromXp(p.xp ?? 0).level,
      streak: p.currentStreak ?? 0,
      stepsToday,
      stepsGoal: p.steps?.goal ?? 8000,
      nextAlarm,
    };
  } catch {
    return null;
  }
}

export default function WidgetView() {
  const [snap, setSnap] = useState<Snapshot | null>(() => readSnapshot());

  useEffect(() => {
    const iv = setInterval(() => setSnap(readSnapshot()), 3000);
    return () => clearInterval(iv);
  }, []);

  const progress = snap ? Math.min(1, snap.stepsToday / Math.max(1, snap.stepsGoal)) : 0;

  return (
    <div
      onClick={() => window.lennyxWidget?.openApp()}
      style={{
        width: '100vw', height: '100vh', boxSizing: 'border-box',
        background: 'linear-gradient(160deg, #111116, #0a0a0d)',
        border: '1px solid #3a2f14', borderRadius: 16,
        padding: '14px 16px', cursor: 'pointer', color: '#eae6dc',
        fontFamily: 'Manrope, system-ui, sans-serif', display: 'flex', flexDirection: 'column',
        gap: 10, userSelect: 'none',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
      title="Cliquer pour ouvrir Lennyx"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Logo size={26} />
        <strong style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', fontSize: 13, color: '#d4af37' }}>LENNYX</strong>
        <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>{snap ? `Niv. ${snap.level}` : '…'}</span>
      </div>

      {snap ? (
        <>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{snap.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid #232323', position: 'relative', flexShrink: 0 }}>
              <svg width="34" height="34" style={{ position: 'absolute', top: -3, left: -3, transform: 'rotate(-90deg)' }}>
                <circle cx="17" cy="17" r="14" fill="none" stroke="#d4af37" strokeWidth="3" strokeDasharray={2 * Math.PI * 14} strokeDashoffset={2 * Math.PI * 14 * (1 - progress)} strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ fontSize: 11 }}>
              <div>{snap.stepsToday.toLocaleString('fr-FR')} / {snap.stepsGoal.toLocaleString('fr-FR')} pas</div>
              <div style={{ opacity: 0.7, display: 'flex', gap: 8, marginTop: 2 }}>
                <span><Icon name="flame" size={11} /> {snap.streak}j</span>
                {snap.nextAlarm && <span><Icon name="sun" size={11} /> {snap.nextAlarm}</span>}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
            <Icon name="eye" size={11} /> Parler à l'Oracle…
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.6 }}>Ouvre Lennyx pour synchroniser le widget…</div>
      )}
    </div>
  );
}
