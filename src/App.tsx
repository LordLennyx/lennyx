import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { levelFromXp } from './game/xp';
import { THEMES, titleLabel } from './game/content';
import HomePage from './pages/HomePage';
import QuestsPage from './pages/QuestsPage';
import DailiesPage from './pages/DailiesPage';
import LibraryPage from './pages/LibraryPage';
import OraclePage from './pages/OraclePage';
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
import { setSoundPrefs } from './lib/sound';
import { startMusic, stopMusic, setMusicMood, setMusicVolume } from './lib/music';
import { ensurePermission } from './lib/notify';

type PageId = 'home' | 'quests' | 'dailies' | 'library' | 'oracle' | 'profile' | 'rewards' | 'settings';

const NAV: Array<{ id: PageId; icon: string; label: string }> = [
  { id: 'home', icon: 'home', label: 'Accueil' },
  { id: 'quests', icon: 'sword', label: 'Quêtes' },
  { id: 'dailies', icon: 'calendar', label: 'Quotidiennes' },
  { id: 'library', icon: 'book', label: 'Bibliothèque' },
  { id: 'oracle', icon: 'eye', label: 'Oracle' },
  { id: 'profile', icon: 'user', label: 'Profil' },
  { id: 'rewards', icon: 'trophy', label: 'Récompenses' },
  { id: 'settings', icon: 'gear', label: 'Réglages' },
];

export default function App() {
  const [page, setPage] = useState<PageId>('home');
  const profile = useStore((s) => s.profile);
  const reconcile = useStore((s) => s.reconcile);
  const info = levelFromXp(profile.xp);
  const title = titleLabel(profile.title);

  useEffect(() => {
    reconcile();
    const t = setInterval(reconcile, 60_000);
    return () => clearInterval(t);
  }, [reconcile]);

  // notifications (rappels, briefing, sentinelle, natives sur Android)
  useNotifications();
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
      <BurstFX />
    </div>
  );
}
