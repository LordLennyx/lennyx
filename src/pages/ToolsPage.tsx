import { useEffect, useRef, useState } from 'react';
import { useStore, stepsOn } from '../store/useStore';
import { addDays, todayStr, WEEKDAYS, isScheduledOn } from '../game/engine';
import { MELODIES, playMelody, stopMelody, CUSTOM_AUDIO_KEY } from '../lib/melodies';
import { Icon } from '../components/Icon';
import { speak, stopSpeaking } from '../lib/voice';
import ShareCardButton from '../components/ShareCardButton';
import { levelFromXp } from '../game/xp';
import { notifyNow } from '../lib/notify';

type Tab = 'chrono' | 'pomodoro' | 'alarms' | 'steps' | 'breathing';

// ═══════════════ CHRONO ═══════════════

function fmtDur(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

function ChronoTab() {
  const { timeLog, logTime, deleteTimeLog, dailies, profile } = useStore();
  const [label, setLabel] = useState('');
  const [taskId, setTaskId] = useState('');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 250);
    return () => clearInterval(iv);
  }, [running]);

  const start = () => {
    startRef.current = Date.now();
    setElapsed(0);
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    const secs = (Date.now() - startRef.current) / 1000;
    const linked = dailies.find((d) => d.id === taskId);
    logTime(label || linked?.title || 'Session', secs, taskId || undefined);
    setElapsed(0);
  };

  // stats par libellé
  const byLabel = new Map<string, { count: number; total: number; best: number }>();
  for (const e of timeLog) {
    const cur = byLabel.get(e.label) ?? { count: 0, total: 0, best: Infinity };
    byLabel.set(e.label, { count: cur.count + 1, total: cur.total + e.seconds, best: Math.min(cur.best, e.seconds) });
  }
  const stats = [...byLabel.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  return (
    <>
      <div className="card ornate" style={{ textAlign: 'center', padding: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 58, letterSpacing: '0.08em' }}>
          {fmtDur(elapsed)}
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
          <input
            className="input"
            style={{ maxWidth: 240 }}
            placeholder="Nom de la session (ex : se préparer)"
            value={label}
            disabled={running}
            onChange={(e) => setLabel(e.target.value)}
          />
          <select className="input" style={{ maxWidth: 220 }} value={taskId} disabled={running} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">— lier à une quotidienne (optionnel) —</option>
            {dailies.map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
          {!running ? (
            <button className="btn primary" style={{ padding: '12px 28px', fontSize: 15 }} onClick={start}>
              <Icon name="bolt" size={15} /> Démarrer
            </button>
          ) : (
            <button className="btn danger" style={{ padding: '12px 28px', fontSize: 15 }} onClick={stop}>
              <Icon name="check" size={15} /> Terminer la session
            </button>
          )}
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Une session d'au moins 10 minutes rapporte de l'XP (1 XP / 2 min, max 30). L'Oracle
          utilise tes moyennes pour ses prédictions.
        </p>
      </div>

      {stats.length > 0 && (
        <>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-title" style={{ marginBottom: 0, flex: 1 }}><Icon name="chart" size={13} /> Tes moyennes</h3>
            <ShareCardButton
              label="Partager mon record"
              build={() => {
                const info = levelFromXp(profile.xp);
                const top = stats[0];
                return {
                  name: profile.name,
                  level: info.level,
                  rankName: info.rank.name,
                  headline: 'Record chronométré',
                  stats: [
                    { label: top[0], value: fmtDur(top[1].best) },
                    { label: 'Sessions enregistrées', value: `${top[1].count}` },
                    { label: 'Moyenne', value: fmtDur(top[1].total / top[1].count) },
                  ],
                  footer: 'CHRONO — ORDRE & GLOIRE',
                };
              }}
            />
          </div>
          <div className="grid2">
            {stats.map(([l, s]) => (
              <div key={l} className="card">
                <div style={{ fontWeight: 700 }}>{l}</div>
                <div className="muted" style={{ marginTop: 3 }}>
                  {s.count} session(s) · moyenne {fmtDur(s.total / s.count)} · record {fmtDur(s.best)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="section-title"><Icon name="hourglass" size={13} /> Historique</h3>
      {timeLog.length === 0 ? (
        <div className="card muted">Aucune session pour l'instant. Chronomètre ta prochaine routine !</div>
      ) : (
        timeLog.slice(0, 12).map((e) => (
          <div key={e.id} className="card row" style={{ padding: '10px 16px' }}>
            <div className="grow">
              <strong>{e.label}</strong>
              <span className="muted"> — {fmtDur(e.seconds)} · {e.date} à {e.startedAt}</span>
            </div>
            <button className="btn small danger icon-only" onClick={() => deleteTimeLog(e.id)}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        ))
      )}
    </>
  );
}

// ═══════════════ POMODORO ═══════════════

type PomoPhase = 'idle' | 'work' | 'break' | 'longBreak';

function PomodoroTab() {
  const settings = useStore((s) => s.profile.pomodoro);
  const setPomodoroSettings = useStore((s) => s.setPomodoroSettings);
  const logPomodoro = useStore((s) => s.logPomodoro);
  const soundOn = useStore((s) => s.profile.soundOn);
  const notifyEnabled = useStore((s) => s.profile.notify.enabled);
  const pomodoros = useStore((s) => s.profile.counters.pomodoros);

  const [phase, setPhase] = useState<PomoPhase>('idle');
  const [remaining, setRemaining] = useState(settings.workMin * 60);
  const [cycle, setCycle] = useState(0); // sessions de travail complétées dans ce cycle
  const [running, setRunning] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const durationFor = (p: PomoPhase) =>
    p === 'work' ? settings.workMin * 60 : p === 'longBreak' ? settings.longBreakMin * 60 : settings.breakMin * 60;

  const stopTick = () => { if (tickRef.current) clearInterval(tickRef.current); tickRef.current = null; };

  const goToPhase = (p: PomoPhase, autoStart: boolean) => {
    setPhase(p);
    setRemaining(durationFor(p));
    setRunning(autoStart);
  };

  const onPhaseEnd = () => {
    stopTick();
    if (phase === 'work') {
      logPomodoro(settings.workMin);
      const nextCycle = cycle + 1;
      setCycle(nextCycle);
      const isLong = nextCycle % settings.longBreakEvery === 0;
      notifyNow('celebrate', 'Pomodoro terminé', isLong ? 'Pause longue méritée.' : 'Petite pause, puis on repart.', soundOn);
      goToPhase(isLong ? 'longBreak' : 'break', false);
    } else {
      notifyNow('briefing', 'Pause terminée', 'Prêt pour une nouvelle session de travail ?', soundOn);
      goToPhase('work', false);
    }
  };

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { onPhaseEnd(); return 0; }
        return r - 1;
      });
    }, 1000);
    return stopTick;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = () => {
    if (phase === 'idle') goToPhase('work', true);
    else setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => { stopTick(); setPhase('idle'); setRunning(false); setCycle(0); setRemaining(settings.workMin * 60); };
  const skip = () => onPhaseEnd();

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(Math.floor(remaining % 60)).padStart(2, '0');
  const phaseLabel = phase === 'work' ? 'Travail' : phase === 'break' ? 'Pause' : phase === 'longBreak' ? 'Pause longue' : 'Prêt';
  const phaseColor = phase === 'work' ? 'var(--accent)' : phase === 'idle' ? 'var(--muted)' : 'var(--success)';

  return (
    <>
      <div className="card ornate" style={{ textAlign: 'center', padding: 30 }}>
        <div className="badge" style={{ color: phaseColor, marginBottom: 14 }}>{phaseLabel}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 58, letterSpacing: '0.08em' }}>{mm}:{ss}</div>
        <p className="muted" style={{ marginTop: 6 }}>
          Session {cycle % settings.longBreakEvery === 0 && cycle > 0 ? settings.longBreakEvery : (cycle % settings.longBreakEvery) + 1}/{settings.longBreakEvery} avant la pause longue
        </p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
          {!running ? (
            <button className="btn primary" style={{ padding: '12px 28px' }} onClick={start}>
              <Icon name="bolt" size={15} /> {phase === 'idle' ? 'Démarrer' : 'Reprendre'}
            </button>
          ) : (
            <button className="btn" style={{ padding: '12px 28px' }} onClick={pause}>Pause</button>
          )}
          <button className="btn small" onClick={skip} disabled={phase === 'idle'}>Passer</button>
          <button className="btn small danger" onClick={reset} disabled={phase === 'idle' && !running}>Réinitialiser</button>
        </div>
      </div>

      <h3 className="section-title"><Icon name="gear" size={13} /> Réglages</h3>
      <div className="card">
        <div className="row" style={{ gap: 16 }}>
          <label className="row" style={{ gap: 8 }}>
            <span className="muted">Travail</span>
            <input
              className="input" type="number" min={5} max={90} style={{ width: 70 }}
              value={settings.workMin} onChange={(e) => setPomodoroSettings({ workMin: Math.max(5, Number(e.target.value)) })}
            /> <span className="muted">min</span>
          </label>
          <label className="row" style={{ gap: 8 }}>
            <span className="muted">Pause</span>
            <input
              className="input" type="number" min={1} max={30} style={{ width: 70 }}
              value={settings.breakMin} onChange={(e) => setPomodoroSettings({ breakMin: Math.max(1, Number(e.target.value)) })}
            /> <span className="muted">min</span>
          </label>
          <label className="row" style={{ gap: 8 }}>
            <span className="muted">Pause longue</span>
            <input
              className="input" type="number" min={5} max={60} style={{ width: 70 }}
              value={settings.longBreakMin} onChange={(e) => setPomodoroSettings({ longBreakMin: Math.max(5, Number(e.target.value)) })}
            /> <span className="muted">min</span>
          </label>
          <label className="row" style={{ gap: 8 }}>
            <span className="muted">Toutes les</span>
            <input
              className="input" type="number" min={2} max={8} style={{ width: 60 }}
              value={settings.longBreakEvery} onChange={(e) => setPomodoroSettings({ longBreakEvery: Math.max(2, Number(e.target.value)) })}
            /> <span className="muted">sessions</span>
          </label>
        </div>
        {!notifyEnabled && (
          <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Active les notifications dans Réglages pour être prévenu même en changeant d'onglet.
          </p>
        )}
      </div>

      <div className="stat-grid" style={{ marginTop: 12 }}>
        <div className="stat-tile">
          <div className="value">{pomodoros}</div>
          <div className="label">Pomodoros accomplis</div>
        </div>
        <div className="stat-tile">
          <div className="value">{cycle}</div>
          <div className="label">Cette session</div>
        </div>
      </div>
    </>
  );
}

// ═══════════════ ALARMES ═══════════════

function AlarmCard({ kind }: { kind: 'wake' | 'lullaby' }) {
  const alarm = useStore((s) => s.profile.alarms[kind]);
  const customName = useStore((s) => s.profile.alarms.customAudioName);
  const setAlarm = useStore((s) => s.setAlarm);
  const setCustomAudioName = useStore((s) => s.setCustomAudioName);
  const pushToast = useStore((s) => s.pushToast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const isWake = kind === 'wake';
  const gallery = MELODIES.filter((m) => m.kind === (isWake ? 'wake' : 'lullaby'));

  const togglePreview = () => {
    if (preview) {
      stopMelody();
      setPreview(false);
    } else {
      playMelody(alarm.melody, alarm.volume);
      setPreview(true);
      setTimeout(() => { stopMelody(); setPreview(false); }, 8000);
    }
  };

  const onFile = async (f: File) => {
    if (f.size > 3_500_000) {
      pushToast('warning', 'Fichier trop lourd (max ~3,5 Mo) — choisis un extrait plus court', 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(CUSTOM_AUDIO_KEY, String(reader.result));
        setCustomAudioName(f.name);
        setAlarm(kind, { melody: 'custom' });
        pushToast('check', `« ${f.name} » importé`, 'info');
      } catch {
        pushToast('warning', 'Stockage insuffisant pour ce fichier', 'warn');
      }
    };
    reader.readAsDataURL(f);
  };

  const toggleDay = (d: number) =>
    setAlarm(kind, { days: alarm.days.includes(d) ? alarm.days.filter((x) => x !== d) : [...alarm.days, d] });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 16, display: 'flex', gap: 9, alignItems: 'center' }}>
          <Icon name={isWake ? 'sun' : 'moon'} size={17} style={{ color: 'var(--gold)' }} />
          {isWake ? 'Réveil' : 'Berceuse du soir'}
        </h3>
        <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={alarm.on} onChange={(e) => setAlarm(kind, { on: e.target.checked })} />
          <span className="muted">{alarm.on ? 'activé' : 'désactivé'}</span>
        </label>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <input
          type="time" className="input" style={{ width: 120 }}
          value={alarm.time}
          onChange={(e) => setAlarm(kind, { time: e.target.value })}
        />
        <div className="row" style={{ gap: 6 }}>
          {WEEKDAYS.map((w) => (
            <button key={w.id} className={`chip ${alarm.days.length === 0 || alarm.days.includes(w.id) ? 'on' : ''}`} onClick={() => toggleDay(w.id)} style={{ fontSize: 10, padding: '4px 8px' }}>
              {w.short}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <span className="muted">Mélodie</span>
        <div className="row" style={{ marginTop: 6 }}>
          {gallery.map((m) => (
            <button key={m.id} className={`chip ${alarm.melody === m.id ? 'on' : ''}`} onClick={() => setAlarm(kind, { melody: m.id })}>
              {m.name}
            </button>
          ))}
          <button className={`chip ${alarm.melody === 'custom' ? 'on' : ''}`} onClick={() => (customName ? setAlarm(kind, { melody: 'custom' }) : fileRef.current?.click())}>
            {customName ? `♪ ${customName.slice(0, 18)}` : '+ Mon fichier audio'}
          </button>
          {customName && (
            <button className="btn small" onClick={() => fileRef.current?.click()}>Changer</button>
          )}
          <input
            ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }}
          />
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <span className="muted" style={{ width: 70 }}>Volume</span>
        <input
          type="range" min="0.1" max="1" step="0.05" className="grow" style={{ maxWidth: 220 }}
          value={alarm.volume}
          onChange={(e) => setAlarm(kind, { volume: Number(e.target.value) })}
        />
        <button className="btn small" onClick={togglePreview}>
          {preview ? 'Stop' : 'Écouter'}
        </button>
      </div>
    </div>
  );
}

function AlarmsTab() {
  const wakeLog = useStore((s) => s.profile.wakeLog);
  const t = todayStr();
  const recent: Array<{ d: string; time: string }> = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(t, -i);
    if (wakeLog[d]) recent.push({ d, time: wakeLog[d] });
  }
  return (
    <>
      <AlarmCard kind="wake" />
      <AlarmCard kind="lullaby" />
      <div className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15, marginBottom: 8 }}>
          Journal de réveil
        </h3>
        {recent.length === 0 ? (
          <p className="muted">Chaque fois que tu arrêtes le réveil, l'heure est notée ici — et l'Oracle s'en sert pour ses prédictions.</p>
        ) : (
          <div className="row">
            {recent.map((r) => (
              <span key={r.d} className="badge">{r.d.slice(5)} · {r.time}</span>
            ))}
          </div>
        )}
        <p className="muted" style={{ marginTop: 10 }}>
          Sur Android, une notification sonne à l'heure du réveil même app fermée : ouvre-la et la
          mélodie se lance en plein écran.
        </p>
      </div>
    </>
  );
}

// ═══════════════ PAS ═══════════════

function StepsTab() {
  const profile = useStore((s) => s.profile);
  const addManualSteps = useStore((s) => s.addManualSteps);
  const setStepsGoal = useStore((s) => s.setStepsGoal);
  const [manual, setManual] = useState('');
  const t = todayStr();
  const today = stepsOn(profile, t);
  const progress = Math.min(1, today / profile.steps.goal);
  const R = 62;
  const C = 2 * Math.PI * R;

  const week: Array<{ d: string; n: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t, -i);
    week.push({ d, n: stepsOn(profile, d) });
  }
  const maxWeek = Math.max(1, ...week.map((w) => w.n));

  return (
    <>
      <div className="card ornate" style={{ textAlign: 'center', padding: 26 }}>
        <div className="level-ring" style={{ width: 140, height: 140, margin: '0 auto' }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--panel2)" strokeWidth="8" />
            <circle
              cx="70" cy="70" r={R} fill="none" stroke="url(#stepGrad)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <defs>
              <linearGradient id="stepGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--accent)" />
                <stop offset="1" stopColor="var(--accent2)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="ring-val">
            <b style={{ fontSize: 26 }}>{today.toLocaleString('fr-FR')}</b>
            <small>/ {profile.steps.goal.toLocaleString('fr-FR')} pas</small>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Le capteur compte quand l'application est ouverte (téléphone en poche, écran allumé ou
          non selon l'appareil). Ajoute le reste à la main — l'honnêteté est ta première quête.
        </p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
          <input
            className="input" type="number" min="1" style={{ maxWidth: 140 }}
            placeholder="Ajouter des pas" value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <button
            className="btn primary small"
            disabled={!manual || Number(manual) <= 0}
            onClick={() => { addManualSteps(Number(manual)); setManual(''); }}
          >
            <Icon name="plus" size={13} /> Ajouter
          </button>
          <select className="input" style={{ maxWidth: 170 }} value={profile.steps.goal} onChange={(e) => setStepsGoal(Number(e.target.value))}>
            {[4000, 6000, 8000, 10000, 12000, 15000, 20000].map((g) => (
              <option key={g} value={g}>Objectif : {g.toLocaleString('fr-FR')}</option>
            ))}
          </select>
        </div>
      </div>

      <h3 className="section-title"><Icon name="chart" size={13} /> Cette semaine</h3>
      <div className="card">
        <div className="bars" style={{ height: 90 }}>
          {week.map((w) => (
            <div key={w.d} className="bar" style={{ height: `${Math.round((w.n / maxWeek) * 100)}%` }} title={`${w.d} : ${w.n.toLocaleString('fr-FR')} pas`} />
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <span className="muted">il y a 7 jours</span>
          <span className="muted">aujourd'hui</span>
        </div>
      </div>

      <div className="stat-grid" style={{ marginTop: 12 }}>
        <div className="stat-tile">
          <div className="value">{profile.steps.bestDay.toLocaleString('fr-FR')}</div>
          <div className="label">Record / jour</div>
        </div>
        <div className="stat-tile">
          <div className="value">{Math.round(week.reduce((a, w) => a + w.n, 0) / 7).toLocaleString('fr-FR')}</div>
          <div className="label">Moyenne 7 jours</div>
        </div>
        <div className="stat-tile">
          <div className="value">{profile.counters.totalSteps.toLocaleString('fr-FR')}</div>
          <div className="label">Total de carrière</div>
        </div>
      </div>
    </>
  );
}

// ═══════════════ RESPIRATION & MÉDITATION ═══════════════

interface Phase { label: string; sec: number; scale: number }

const PATTERNS: Record<string, { name: string; desc: string; phases: Phase[] }> = {
  coherence: {
    name: 'Cohérence cardiaque',
    desc: '5 s inspire / 5 s expire — 6 respirations par minute',
    phases: [{ label: 'Inspire', sec: 5, scale: 1 }, { label: 'Expire', sec: 5, scale: 0.55 }],
  },
  box: {
    name: 'Respiration carrée',
    desc: '4-4-4-4 — ancrage et concentration',
    phases: [
      { label: 'Inspire', sec: 4, scale: 1 }, { label: 'Retiens', sec: 4, scale: 1 },
      { label: 'Expire', sec: 4, scale: 0.55 }, { label: 'Retiens', sec: 4, scale: 0.55 },
    ],
  },
  relax478: {
    name: 'Détente 4-7-8',
    desc: 'Avant le sommeil — inspire 4, retiens 7, expire 8',
    phases: [{ label: 'Inspire', sec: 4, scale: 1 }, { label: 'Retiens', sec: 7, scale: 1 }, { label: 'Expire', sec: 8, scale: 0.55 }],
  },
};

const MEDITATION_SCRIPT = `Installe-toi confortablement, ferme les yeux si tu le souhaites.
Prends une profonde inspiration… et relâche, lentement.
Laisse tes épaules descendre, ton front se détendre.
À chaque expiration, laisse partir un peu de la tension de la journée.
Il n'y a rien à faire, rien à réussir, juste être là, un instant.
Écoute ta respiration, sans la forcer, telle qu'elle est.
Encore quelques respirations, calmes, profondes, régulières.
Quand tu seras prêt, tu pourras rouvrir les yeux, apaisé.`;

function BreathingTab() {
  const logBreathing = useStore((s) => s.logBreathing);
  const voice = useStore((s) => s.profile.voice);
  const [patternId, setPatternId] = useState<keyof typeof PATTERNS>('coherence');
  const [duration, setDuration] = useState(180); // secondes
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [voiceCues, setVoiceCues] = useState(true);
  const startRef = useRef(0);
  const phaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const pattern = PATTERNS[patternId];

  const stopAll = (log: boolean) => {
    setRunning(false);
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    void stopSpeaking();
    if (log) logBreathing((Date.now() - startRef.current) / 1000);
  };

  const runPhase = (idx: number, endAt: number) => {
    if (Date.now() >= endAt) { stopAll(true); return; }
    const ph = pattern.phases[idx % pattern.phases.length];
    setPhaseIdx(idx % pattern.phases.length);
    if (voiceCues) void speak(ph.label, voice);
    phaseTimer.current = setTimeout(() => runPhase(idx + 1, endAt), ph.sec * 1000);
  };

  const start = () => {
    startRef.current = Date.now();
    const endAt = Date.now() + duration * 1000;
    setRunning(true);
    setRemaining(duration);
    runPhase(0, endAt);
    tickTimer.current = setInterval(() => {
      const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && tickTimer.current) clearInterval(tickTimer.current);
    }, 500);
  };

  useEffect(() => () => stopAll(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  const ph = pattern.phases[phaseIdx];

  return (
    <>
      <div className="card ornate" style={{ textAlign: 'center', padding: 30 }}>
        <div
          style={{
            width: 160, height: 160, margin: '0 auto', borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent2) 35%, transparent), color-mix(in srgb, var(--accent) 25%, transparent))',
            border: '1px solid color-mix(in srgb, var(--accent) 45%, var(--border))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${running ? ph.scale : 0.8})`,
            transition: running ? `transform ${ph.sec}s ease-in-out` : 'transform 0.4s ease',
          }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.1em', color: 'var(--gold)' }}>
            {running ? ph.label : '—'}
          </span>
        </div>

        {!running ? (
          <>
            <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
              {Object.entries(PATTERNS).map(([id, p]) => (
                <button key={id} className={`chip ${patternId === id ? 'on' : ''}`} onClick={() => setPatternId(id as keyof typeof PATTERNS)} title={p.desc}>
                  {p.name}
                </button>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 6 }}>{pattern.desc}</p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
              {[120, 180, 300, 600].map((d) => (
                <button key={d} className={`chip ${duration === d ? 'on' : ''}`} onClick={() => setDuration(d)}>
                  {d / 60} min
                </button>
              ))}
            </div>
            <label className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={voiceCues} onChange={(e) => setVoiceCues(e.target.checked)} />
              <span className="muted">Guidage vocal de l'Oracle</span>
            </label>
            <button className="btn primary" style={{ marginTop: 16, padding: '12px 28px' }} onClick={start}>
              <Icon name="sparkle" size={15} /> Commencer
            </button>
          </>
        ) : (
          <>
            <div style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontSize: 22 }}>{remaining}s</div>
            <button className="btn danger" style={{ marginTop: 14 }} onClick={() => stopAll(true)}>
              Terminer
            </button>
          </>
        )}
      </div>

      <h3 className="section-title"><Icon name="moon" size={13} /> Méditation flash</h3>
      <div className="card">
        <p className="muted" style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>{MEDITATION_SCRIPT}</p>
        <div className="row" style={{ marginTop: 10 }}>
          <button
            className="btn"
            onClick={() => { void speak(MEDITATION_SCRIPT, voice); logBreathing(150); }}
          >
            <Icon name="eye" size={13} /> Écouter, guidé par l'Oracle
          </button>
          <button className="btn small danger" onClick={() => void stopSpeaking()}>Arrêter la voix</button>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Idéale juste avant la berceuse du soir, dans Outils → Alarmes.
        </p>
      </div>
    </>
  );
}

// ═══════════════ PAGE ═══════════════

export default function ToolsPage() {
  const [tab, setTab] = useState<Tab>('chrono');
  const TABS: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'chrono', label: 'Chrono', icon: 'hourglass' },
    { id: 'pomodoro', label: 'Pomodoro', icon: 'clock' },
    { id: 'alarms', label: 'Alarmes', icon: 'sun' },
    { id: 'steps', label: 'Pas', icon: 'heart' },
    { id: 'breathing', label: 'Respiration', icon: 'sparkle' },
  ];
  return (
    <div>
      <h2 className="page-title">Outils</h2>
      <p className="page-sub">Chronomètre, Pomodoro, alarmes, podomètre et respiration — les instruments de ta discipline.</p>
      <div className="row" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`chip ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={13} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'chrono' && <ChronoTab />}
      {tab === 'pomodoro' && <PomodoroTab />}
      {tab === 'alarms' && <AlarmsTab />}
      {tab === 'steps' && <StepsTab />}
      {tab === 'breathing' && <BreathingTab />}
    </div>
  );
}
