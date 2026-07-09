import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { levelFromXp } from './game/xp';
import HomePage from './pages/HomePage';
import QuestsPage from './pages/QuestsPage';
import DailiesPage from './pages/DailiesPage';
import ProfilePage from './pages/ProfilePage';
import RewardsPage from './pages/RewardsPage';
import SettingsPage from './pages/SettingsPage';
import Toasts from './components/Toasts';
import LevelUpModal from './components/LevelUpModal';

type PageId = 'home' | 'quests' | 'dailies' | 'profile' | 'rewards' | 'settings';

const NAV: Array<{ id: PageId; icon: string; label: string }> = [
  { id: 'home', icon: '🏠', label: 'Accueil' },
  { id: 'quests', icon: '⚔️', label: 'Quêtes' },
  { id: 'dailies', icon: '📅', label: 'Quotidiennes' },
  { id: 'profile', icon: '👤', label: 'Profil' },
  { id: 'rewards', icon: '🏆', label: 'Récompenses' },
  { id: 'settings', icon: '⚙️', label: 'Réglages' },
];

export default function App() {
  const [page, setPage] = useState<PageId>('home');
  const profile = useStore((s) => s.profile);
  const reconcile = useStore((s) => s.reconcile);
  const info = levelFromXp(profile.xp);

  // rattrapage à l'ouverture + quand un nouveau jour commence pendant que l'app est ouverte
  useEffect(() => {
    reconcile();
    const t = setInterval(reconcile, 60_000);
    return () => clearInterval(t);
  }, [reconcile]);

  useEffect(() => {
    document.documentElement.dataset.theme = profile.theme;
  }, [profile.theme]);

  const navButtons = (cls: string) =>
    NAV.map((n) => (
      <button
        key={n.id}
        className={`nav-btn ${cls} ${page === n.id ? 'active' : ''}`}
        onClick={() => setPage(n.id)}
      >
        <span className="nav-icon">{n.icon}</span>
        <span>{n.label}</span>
      </button>
    ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="app" style={{ flex: 1, minHeight: 0 }}>
        <nav className="sidebar">
          <div className="logo">⚔️ LENNYX</div>
          {navButtons('')}
        </nav>
        <div className="main">
          <header className="topbar">
            <span style={{ fontSize: 26 }}>{profile.avatar}</span>
            <div className="grow" style={{ minWidth: 140 }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
                <strong style={{ fontSize: 14 }}>{profile.name}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  Niv. {info.level} · {info.rank.icon} {info.rank.name}
                </span>
              </div>
              <div className="row" style={{ marginTop: 4, gap: 8 }}>
                <div className="xpbar">
                  <div style={{ width: `${Math.round(info.progress * 100)}%` }} />
                </div>
                <span className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  {info.xpInLevel}/{info.xpNeeded || '—'} XP
                </span>
              </div>
            </div>
            <span className="badge" title="Streak global (jours consécutifs actifs)">
              🔥 {profile.currentStreak}
            </span>
            {profile.combo > 1 && (
              <span className="badge" style={{ color: 'var(--accent2)' }} title="Combo du jour">
                ⚡ x{profile.combo}
              </span>
            )}
            <span className="badge" style={{ color: 'var(--gold)' }} title="Or">
              🪙 {profile.gold}
            </span>
          </header>
          <main className="content">
            {page === 'home' && <HomePage goTo={(p) => setPage(p as PageId)} />}
            {page === 'quests' && <QuestsPage />}
            {page === 'dailies' && <DailiesPage />}
            {page === 'profile' && <ProfilePage />}
            {page === 'rewards' && <RewardsPage />}
            {page === 'settings' && <SettingsPage />}
          </main>
        </div>
      </div>
      <nav className="bottombar">{navButtons('')}</nav>
      <Toasts />
      <LevelUpModal />
    </div>
  );
}
