import { useStore } from '../store/useStore';
import { RANKS, levelFromXp } from '../game/xp';
import { addDays, todayStr } from '../game/engine';
import { ACHIEVEMENTS } from '../game/content';

export default function ProfilePage() {
  const profile = useStore((s) => s.profile);
  const info = levelFromXp(profile.xp);

  // XP des 14 derniers jours
  const t = todayStr();
  const days: Array<{ date: string; xp: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(t, -i);
    days.push({ date: d, xp: profile.history[d] ?? 0 });
  }
  const maxXp = Math.max(1, ...days.map((d) => d.xp));
  const unlockedCount = Object.keys(profile.unlocked).length;

  return (
    <div>
      <h2 className="page-title">👤 Profil</h2>

      <div className="card row" style={{ gap: 16 }}>
        <span style={{ fontSize: 54 }}>{profile.avatar}</span>
        <div className="grow">
          <div style={{ fontSize: 20, fontWeight: 800 }}>{profile.name}</div>
          <div style={{ color: info.rank.color, fontWeight: 700 }}>
            {info.rank.icon} {info.rank.name} · Niveau {info.level}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <div className="xpbar">
              <div style={{ width: `${Math.round(info.progress * 100)}%` }} />
            </div>
            <span className="muted" style={{ whiteSpace: 'nowrap' }}>
              {info.xpInLevel}/{info.xpNeeded || '—'} XP
            </span>
          </div>
        </div>
      </div>

      <h3 className="section-title">📊 Statistiques</h3>
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="value" style={{ color: 'var(--accent2)' }}>{profile.xp}</div>
          <div className="label">XP total</div>
        </div>
        <div className="stat-tile">
          <div className="value" style={{ color: 'var(--gold)' }}>🪙 {profile.gold}</div>
          <div className="label">Or</div>
        </div>
        <div className="stat-tile">
          <div className="value">🔥 {profile.maxStreak}</div>
          <div className="label">Meilleur streak</div>
        </div>
        <div className="stat-tile">
          <div className="value">⚡ x{profile.bestCombo}</div>
          <div className="label">Meilleur combo</div>
        </div>
        <div className="stat-tile">
          <div className="value">⚔️ {profile.counters.quests}</div>
          <div className="label">Quêtes accomplies</div>
        </div>
        <div className="stat-tile">
          <div className="value">📅 {profile.counters.dailies}</div>
          <div className="label">Quotidiennes accomplies</div>
        </div>
        <div className="stat-tile">
          <div className="value">🌟 {profile.counters.events}</div>
          <div className="label">Événements spéciaux</div>
        </div>
        <div className="stat-tile">
          <div className="value">
            🏅 {unlockedCount}/{ACHIEVEMENTS.length}
          </div>
          <div className="label">Succès débloqués</div>
        </div>
      </div>

      <h3 className="section-title">📈 XP des 14 derniers jours</h3>
      <div className="card">
        <div className="bars">
          {days.map((d) => (
            <div
              key={d.date}
              className="bar"
              style={{ height: `${Math.round((d.xp / maxXp) * 100)}%` }}
              title={`${d.date} : +${d.xp} XP`}
            />
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <span className="muted">il y a 14 jours</span>
          <span className="muted">aujourd'hui</span>
        </div>
      </div>

      <h3 className="section-title">🎖️ Échelle des rangs</h3>
      <div className="card">
        {RANKS.map((r) => {
          const current = info.level >= r.min && info.level <= r.max;
          return (
            <div key={r.name} className={`rank-row ${current ? 'current' : ''}`}>
              <span style={{ fontSize: 20 }}>{r.icon}</span>
              <span className="grow" style={{ color: current ? r.color : undefined }}>
                {r.name}
              </span>
              <span className="muted">
                {r.min === r.max ? `Niv. ${r.min}` : `Niv. ${r.min}–${r.max}`}
              </span>
              {current && <span>◀ toi</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
