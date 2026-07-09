import { useStore } from '../store/useStore';
import { RANKS, levelFromXp, totalXpForLevel } from '../game/xp';
import { addDays, todayStr } from '../game/engine';
import { ACHIEVEMENTS, titleLabel } from '../game/content';
import { LIBRARY } from '../game/library';
import { Icon, Sigil } from '../components/Icon';

export default function ProfilePage() {
  const profile = useStore((s) => s.profile);
  const info = levelFromXp(profile.xp);
  const title = titleLabel(profile.title);

  const t = todayStr();
  const days: Array<{ date: string; xp: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(t, -i);
    days.push({ date: d, xp: profile.history[d] ?? 0 });
  }
  const maxXp = Math.max(1, ...days.map((d) => d.xp));
  const unlockedCount = Object.keys(profile.unlocked).length;
  const topCats = Object.entries(profile.categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, n]) => ({ rub: LIBRARY.find((r) => r.id === id), n }));

  return (
    <div>
      <h2 className="page-title">Profil</h2>
      <p className="page-sub">Ta légende, chiffrée.</p>

      <div className="card ornate row" style={{ gap: 18 }}>
        <Sigil id={profile.sigil} size={72} />
        <div className="grow">
          <div style={{ fontSize: 21, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
            {profile.name}
            {title && <span style={{ color: 'var(--gold)', fontSize: 15, fontWeight: 500 }}> · {title}</span>}
          </div>
          <div style={{ color: info.rank.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
            <Icon name={info.rank.icon} size={16} /> {info.rank.name} — Niveau {info.level}
          </div>
          <div className="row" style={{ marginTop: 9 }}>
            <div className="xpbar">
              <div style={{ width: `${Math.round(info.progress * 100)}%` }} />
            </div>
            <span className="muted" style={{ whiteSpace: 'nowrap' }}>
              {info.xpInLevel}/{info.xpNeeded || '—'} XP
            </span>
          </div>
        </div>
      </div>

      <h3 className="section-title"><Icon name="chart" size={13} /> Statistiques</h3>
      <div className="stat-grid">
        <div className="stat-tile"><div className="value" style={{ color: 'var(--accent2)' }}>{profile.xp.toLocaleString('fr-FR')}</div><div className="label">XP total</div></div>
        <div className="stat-tile"><div className="value" style={{ color: 'var(--gold)' }}><Icon name="coin" size={18} />{profile.gold}</div><div className="label">Or</div></div>
        <div className="stat-tile"><div className="value"><Icon name="flame" size={18} style={{ color: '#e8964a' }} />{profile.maxStreak}</div><div className="label">Meilleur streak</div></div>
        <div className="stat-tile"><div className="value"><Icon name="bolt" size={18} style={{ color: 'var(--accent2)' }} />×{profile.bestCombo}</div><div className="label">Meilleur combo</div></div>
        <div className="stat-tile"><div className="value">{profile.counters.quests}</div><div className="label">Quêtes</div></div>
        <div className="stat-tile"><div className="value">{profile.counters.dailies}</div><div className="label">Quotidiennes</div></div>
        <div className="stat-tile"><div className="value">{profile.counters.punctual}</div><div className="label">À l'heure</div></div>
        <div className="stat-tile"><div className="value">{profile.counters.perfectDays}</div><div className="label">Journées parfaites</div></div>
        <div className="stat-tile"><div className="value">{profile.counters.events}</div><div className="label">Événements</div></div>
        <div className="stat-tile"><div className="value">{unlockedCount}<span className="muted" style={{ fontSize: 15 }}>/{ACHIEVEMENTS.length}</span></div><div className="label">Succès</div></div>
      </div>

      {topCats.length > 0 && (
        <>
          <h3 className="section-title"><Icon name="grid" size={13} /> Tes terrains de prédilection</h3>
          <div className="row">
            {topCats.map(({ rub, n }) =>
              rub ? (
                <span key={rub.id} className="badge" style={{ padding: '8px 14px' }}>
                  <Icon name={rub.icon} size={14} style={{ color: 'var(--accent)' }} /> {rub.name} — {n}
                </span>
              ) : null,
            )}
          </div>
        </>
      )}

      <h3 className="section-title"><Icon name="chart" size={13} /> XP des 14 derniers jours</h3>
      <div className="card">
        <div className="bars">
          {days.map((d) => (
            <div key={d.date} className="bar" style={{ height: `${Math.round((d.xp / maxXp) * 100)}%` }} title={`${d.date} : +${d.xp} XP`} />
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
          <span className="muted">il y a 14 jours</span>
          <span className="muted">aujourd'hui</span>
        </div>
      </div>

      <h3 className="section-title"><Icon name="crown" size={13} /> Échelle des rangs</h3>
      <div className="card">
        {RANKS.map((r) => {
          const current = info.level >= r.min && info.level <= r.max;
          return (
            <div key={r.name} className={`rank-row ${current ? 'current' : ''}`}>
              <Icon name={r.icon} size={17} style={{ color: current ? r.color : 'var(--muted)' }} />
              <span className="grow" style={{ color: current ? r.color : undefined, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                {r.name}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {r.min === r.max ? `Niv. ${r.min}` : `Niv. ${r.min}–${r.max}`}
                {' · '}{totalXpForLevel(r.min).toLocaleString('fr-FR')} XP
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
