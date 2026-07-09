import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ACHIEVEMENTS, AVATARS, THEMES } from '../game/content';

export default function RewardsPage() {
  const { profile, buyAvatar, buyTheme, setAvatar, setTheme } = useStore();
  const [tab, setTab] = useState<'achievements' | 'shop'>('achievements');
  const unlockedCount = Object.keys(profile.unlocked).length;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 className="page-title" style={{ marginBottom: 0 }}>
          🏆 Récompenses
        </h2>
        <span className="badge" style={{ color: 'var(--gold)' }}>
          🪙 {profile.gold}
        </span>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <button
          className={`chip ${tab === 'achievements' ? 'on' : ''}`}
          onClick={() => setTab('achievements')}
        >
          🏅 Succès ({unlockedCount}/{ACHIEVEMENTS.length})
        </button>
        <button className={`chip ${tab === 'shop' ? 'on' : ''}`} onClick={() => setTab('shop')}>
          🛍️ Boutique
        </button>
      </div>

      {tab === 'achievements' && (
        <div className="grid2">
          {ACHIEVEMENTS.map((a) => {
            const date = profile.unlocked[a.id];
            return (
              <div key={a.id} className={`achv ${date ? '' : 'locked'}`}>
                <span className="icon">{a.icon}</span>
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{a.name}</div>
                  <div className="muted">{a.desc}</div>
                  {date ? (
                    <div className="muted" style={{ color: 'var(--gold)' }}>
                      Débloqué le {date}
                    </div>
                  ) : (
                    a.gold > 0 && <div className="muted">Récompense : {a.gold} 🪙</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'shop' && (
        <>
          <h3 className="section-title">😎 Avatars</h3>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10 }}
          >
            {AVATARS.map((a) => {
              const owned = profile.ownedAvatars.includes(a.emoji);
              const active = profile.avatar === a.emoji;
              const affordable = profile.gold >= a.price;
              return (
                <div
                  key={a.emoji}
                  className={`shop-item ${active ? 'active' : ''} ${owned ? '' : 'locked'}`}
                  onClick={() => (owned ? setAvatar(a.emoji) : buyAvatar(a.emoji))}
                  title={owned ? 'Utiliser' : affordable ? 'Acheter' : "Pas assez d'or"}
                >
                  <span className="emoji">{a.emoji}</span>
                  {owned ? (
                    <span className="muted">{active ? '✓ actif' : 'possédé'}</span>
                  ) : (
                    <span
                      className="badge"
                      style={{ color: affordable ? 'var(--gold)' : 'var(--danger)' }}
                    >
                      🪙 {a.price}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <h3 className="section-title">🎨 Thèmes</h3>
          <div className="grid2">
            {THEMES.map((th) => {
              const owned = profile.ownedThemes.includes(th.id);
              const active = profile.theme === th.id;
              const affordable = profile.gold >= th.price;
              return (
                <div
                  key={th.id}
                  className={`shop-item ${active ? 'active' : ''} ${owned ? '' : 'locked'}`}
                  onClick={() => (owned ? setTheme(th.id) : buyTheme(th.id))}
                >
                  <div
                    style={{
                      width: '100%',
                      height: 26,
                      borderRadius: 8,
                      background: `linear-gradient(90deg, ${th.accent}, ${th.accent2})`,
                    }}
                  />
                  <strong>{th.name}</strong>
                  {owned ? (
                    <span className="muted">{active ? '✓ actif' : 'possédé'}</span>
                  ) : (
                    <span
                      className="badge"
                      style={{ color: affordable ? 'var(--gold)' : 'var(--danger)' }}
                    >
                      🪙 {th.price}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
