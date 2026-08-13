import { useEffect, useRef, useState } from 'react';
import { useStore } from './store/useStore';
import { levelFromXp } from './game/xp';
import { THEMES, titleLabel } from './game/content';
import HomePage from './pages/HomePage';
import QuestsPage from './pages/QuestsPage';
import DailiesPage from './pages/DailiesPage';
import LibraryPage from './pages/LibraryPage';
import OraclePage from './pages/OraclePage';
import ToolsPage from './pages/ToolsPage';
import NotesPage from './pages/NotesPage';
import ProfilePage from './pages/ProfilePage';
import RewardsPage from './pages/RewardsPage';
import SettingsPage from './pages/SettingsPage';
import Toasts from './components/Toasts';
import LevelUpModal from './components/LevelUpModal';
import Ambient from './components/Ambient';
import BurstFX from './components/BurstFX';
import Logo from './components/Logo';
import { Icon, Sigil } from './components/Icon';
import { useNotifications } from './hooks/useNotifications';
import { useSteps } from './hooks/useSteps';
import { useNativeAlarms } from './hooks/useNativeAlarms';
import { useTimers } from './hooks/useTimers';
import AlarmOverlay from './components/AlarmOverlay';
import UpdateBanner from './components/UpdateBanner';
import Onboarding from './components/Onboarding';
import { setSoundPrefs } from './lib/sound';
import { startMusic, stopMusic, setMusicMood, setMusicVolume } from './lib/music';
import { ensurePermission } from './lib/notify';
import { useOnlineStatus } from './lib/net';
import { backgroundSupported, startBackground } from './lib/background';
import { pushWidgetData } from './lib/widget';
import { stepsOn } from './store/useStore';
import { isScheduledOn, todayStr } from './game/engine';

type PageId =
  | 'home' | 'quests' | 'dailies' | 'library' | 'oracle' | 'tools' | 'notes'
  | 'profile' | 'rewards' | 'settings';

const NAV: Array<{ id: PageId; icon: string; label: string }> = [
  { id: 'home', icon: 'home', label: 'Accueil' },
  { id: 'quests', icon: 'sword', label: 'Quêtes' },
  { id: 'dailies', icon: 'calendar', label: 'Quotidiennes' },
  { id: 'library', icon: 'book', label: 'Bibliothèque' },
  { id: 'oracle', icon: 'eye', label: 'Oracle' },
  { id: 'tools', icon: 'hourglass', label: 'Outils' },
  { id: 'notes', icon: 'quill', label: 'Notes' },
  { id: 'profile', icon: 'user', label: 'Profil' },
  { id: 'rewards', icon: 'trophy', label: 'Récompenses' },
  { id: 'settings', icon: 'gear', label: 'Réglages' },
];

/**
 * Section demandée au lancement (`?vue=quests`) : c'est ce qui permet aux
 * raccourcis du manifeste — clic droit sur l'icône du Dock — d'ouvrir Lennyx
 * directement au bon endroit.
 */
function initialPage(): PageId {
  try {
    const wanted = new URLSearchParams(window.location.search).get('vue');
    if (wanted && NAV.some((n) => n.id === wanted)) return wanted as PageId;
  } catch {
    /* URL exotique : on ouvre l'accueil */
  }
  return 'home';
}

export default function App() {
  const [page, setPage] = useState<PageId>(initialPage);
  const profile = useStore((s) => s.profile);
  const dailies = useStore((s) => s.dailies);
  const reconcile = useStore((s) => s.reconcile);
  const setBackground = useStore((s) => s.setBackground);
  const online = useOnlineStatus();
  const info = levelFromXp(profile.xp);
  const title = titleLabel(profile.title);

  useEffect(() => {
    reconcile();
    const t = setInterval(reconcile, 60_000);
    return () => clearInterval(t);
  }, [reconcile]);

  // notifications (rappels, briefing, sentinelle, natives sur Android)
  useNotifications();
  // podomètre (capteur de mouvement)
  useSteps();
  useNativeAlarms();
  useTimers();

  // Raccourcis clavier de bureau : Cmd+1…9 (Ctrl ailleurs) pour naviguer.
  // Une application installée dans le Dock doit se piloter comme les autres.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > NAV.length) return;
      e.preventDefault();
      setPage(NAV[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (profile.notify.enabled) void ensurePermission();
  }, [profile.notify.enabled]);

  // audio : volume des effets + bande sonore générative
  useEffect(() => {
    setSoundPrefs({ volume: profile.audio.volume });
  }, [profile.audio.volume]);

  useEffect(() => {
    setMusicMood(profile.audio.mood);
  }, [profile.audio.mood]);

  useEffect(() => {
    setMusicVolume(profile.audio.musicVolume);
  }, [profile.audio.musicVolume]);

  useEffect(() => {
    if (!profile.audio.music) {
      stopMusic();
      return;
    }
    // l'AudioContext exige un geste utilisateur : on démarre au premier clic
    const kick = () => startMusic(useStore.getState().profile.audio.mood, useStore.getState().profile.audio.musicVolume);
    kick(); // tente tout de suite (Electron l'autorise)
    window.addEventListener('pointerdown', kick, { once: true });
    return () => {
      window.removeEventListener('pointerdown', kick);
      stopMusic();
    };
  }, [profile.audio.music]);

  // ── Présence permanente : le service doit tourner, sinon rien n'est compté ──
  // Android peut avoir tué le service sans redémarrage du téléphone : on le
  // relance à chaque ouverture. Et au tout premier usage, on propose son
  // activation — sans elle, le podomètre serait muet, ce qui n'a aucun sens
  // pour une application censée accompagner la journée entière.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (!backgroundSupported() || bootedRef.current) return;
    if (!profile.onboarding.done) return; // on n'interrompt pas le tutoriel
    bootedRef.current = true;
    void (async () => {
      // on transmet les pas déjà acquis : le service reprend le compteur en
      // cours au lieu de repartir de zéro
      const acquis = stepsOn(profile, todayStr());
      if (profile.background.enabled) {
        await startBackground(acquis); // relance silencieuse
      } else if (!profile.background.askedOnce) {
        const res = await startBackground(acquis);
        setBackground({ enabled: res.running, askedOnce: true });
      }
    })();
  }, [profile.onboarding.done, profile.background.enabled, profile.background.askedOnce, setBackground]);

  // widget natif Android : pousse l'instantané à chaque changement pertinent
  useEffect(() => {
    const t = todayStr();
    const wake = profile.alarms.wake;
    const pending = dailies.filter((d) => isScheduledOn(d.days, t) && d.lastCompletedDate !== t).length;
    pushWidgetData({
      name: profile.name,
      level: info.level,
      rank: info.rank.name,
      xpPercent: Math.round(info.progress * 100),
      stepsToday: stepsOn(profile, t),
      stepsGoal: profile.steps.goal,
      streak: profile.currentStreak,
      pending,
      nextAlarm: wake.on && isScheduledOn(wake.days, t) ? wake.time : '',
    });
  }, [profile.name, info.level, info.rank.name, info.progress, profile.steps, profile.currentStreak, profile.alarms.wake, dailies]);

  // applique la palette du thème actif
  useEffect(() => {
    const theme = THEMES.find((t) => t.id === profile.theme) ?? THEMES[0];
    const root = document.documentElement;
    for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(`--${k}`, v);
  }, [profile.theme]);

  const navButtons = NAV.map((n) => (
    <button key={n.id} className={`nav-btn ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
      <Icon name={n.icon} size={18} />
      <span>{n.label}</span>
    </button>
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Ambient />
      <div className="app" style={{ flex: 1, minHeight: 0 }}>
        <nav className="sidebar">
          <div className="brand">
            <Logo size={40} />
            <div>
              <div className="brand-name">LENNYX</div>
              <div className="brand-sub">Ordre &amp; Gloire</div>
            </div>
          </div>
          {navButtons}
        </nav>

        <div className="main">
          <header className="topbar">
            <Sigil id={profile.sigil} size={40} />
            <div className="grow" style={{ minWidth: 150 }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
                <strong style={{ fontSize: 14, fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                  {profile.name}
                  {title && <span style={{ color: 'var(--gold)', fontWeight: 500 }}> · {title}</span>}
                </strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  Niv. {info.level} — {info.rank.name}
                </span>
              </div>
              <div className="row" style={{ marginTop: 5, gap: 8 }}>
                <div className="xpbar">
                  <div style={{ width: `${Math.round(info.progress * 100)}%` }} />
                </div>
                <span className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  {info.xpInLevel}/{info.xpNeeded || '—'}
                </span>
              </div>
            </div>
            {!online && (
              <span className="badge" title="Hors-ligne : les modules locaux restent actifs, l'Oracle passe en veille locale" style={{ color: 'var(--muted)' }}>
                <Icon name="warning" size={13} /> Hors-ligne
              </span>
            )}
            <span className="badge" title="Streak global">
              <Icon name="flame" size={13} style={{ color: '#e8964a' }} /> {profile.currentStreak}
            </span>
            {profile.combo > 1 && (
              <span className="badge" title="Combo du jour" style={{ color: 'var(--accent2)' }}>
                <Icon name="bolt" size={13} /> ×{profile.combo}
              </span>
            )}
            <span className="badge gold" title="Or">
              <Icon name="coin" size={13} /> {profile.gold}
            </span>
          </header>

          <main className="content">
            <div className="page" key={page}>
              {page === 'home' && <HomePage goTo={(p) => setPage(p as PageId)} />}
              {page === 'quests' && <QuestsPage />}
              {page === 'dailies' && <DailiesPage />}
              {page === 'library' && <LibraryPage />}
              {page === 'oracle' && <OraclePage />}
              {page === 'tools' && <ToolsPage />}
              {page === 'notes' && <NotesPage />}
              {page === 'profile' && <ProfilePage />}
              {page === 'rewards' && <RewardsPage />}
              {page === 'settings' && <SettingsPage />}
            </div>
          </main>
        </div>
      </div>
      <nav className="bottombar">{navButtons}</nav>
      <Toasts />
      <LevelUpModal />
      <AlarmOverlay />
      <UpdateBanner />
      <BurstFX />
      {!profile.onboarding.done && <Onboarding />}
    </div>
  );
}
