import { useState } from 'react';
import { useStore, effectAvailable } from '../store/useStore';
import { ACHIEVEMENTS, EFFECTS, SIGILS, THEMES, TITLES } from '../game/content';
import { levelFromXp } from '../game/xp';
import { Icon, Sigil } from '../components/Icon';

type Tab = 'achievements' | 'themes' | 'sigils' | 'titles' | 'effects';

function PriceTag({ price, owned, active, locked, level }: {
  price: number; owned: boolean; active: boolean; locked?: number; level: number;
}) {
  if (owned) return <span className="muted" style={{ fontSize: 12 }}>{active ? '— porté —' : 'possédé'}</span>;
  if (locked && level < locked)
    return (
      <span className="badge" style={{ color: 'var(--muted)' }}>
        <Icon name="lock" size={11} /> Niv. {locked}
      </span>
    );
  return (
    <span className="badge gold">
      <Icon name="coin" size={11} /> {price}
    </span>
  );
}

export default function RewardsPage() {
  const { profile, buyTheme, buySigil, buyTitle, buyEffect, setTheme, setSigil, setTitle, setAmbient, setBurst } = useStore();
  const [tab, setTab] = useState<Tab>('achievements');
  const level = levelFromXp(profile.xp).level;
  const unlockedCount = Object.keys(profile.unlocked).length;

  const TABS: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'achievements', label: `Succès ${unlockedCount}/${ACHIEVEMENTS.length}`, icon: 'medal' },
    { id: 'themes', label: 'Thèmes', icon: 'palette' },
    { id: 'sigils', label: 'Sigils', icon: 'shield' },
    { id: 'titles', label: 'Titres', icon: 'quill' },
    { id: 'effects', label: 'Effets', icon: 'sparkle' },
  ];

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 className="page-title">Récompenses</h2>
        <span className="badge gold" style={{ fontSize: 14, padding: '6px 14px' }}>
          <Icon name="coin" size={14} /> {profile.gold}
        </span>
      </div>
      <p className="page-sub">Chaque pièce d'or gagnée honore une tâche accomplie. Dépense-les avec panache.</p>

      <div className="row" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`chip ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'achievements' && (
        <div className="grid2">
          {ACHIEVEMENTS.map((a) => {
            const date = profile.unlocked[a.id];
            return (
              <div key={a.id} className={`achv ${date ? '' : 'locked'}`}>
                <span className="a-icon"><Icon name={a.icon} size={20} /></span>
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{a.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{a.desc}</div>
                  {date ? (
                    <div style={{ color: 'var(--gold)', fontSize: 11, marginTop: 2 }}>Débloqué le {date}</div>
                  ) : (
                    a.gold > 0 && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Récompense : {a.gold} or</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'themes' && (
        <div className="grid2">
          {THEMES.map((th) => {
            const owned = profile.ownedThemes.includes(th.id);
            const active = profile.theme === th.id;
            const gated = th.unlockLevel !== undefined && level < th.unlockLevel;
            return (
              <div
                key={th.id}
                className={`shop-item ${active ? 'active' : ''} ${owned ? '' : 'locked'}`}
                onClick={() => (owned ? setTheme(th.id) : gated ? undefined : buyTheme(th.id))}
              >
                <div style={{ width: '100%', height: 40, borderRadius: 9, border: `1px solid ${th.vars.border}`, background: th.vars.bg, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: '8px 40% 8px 8px', borderRadius: 5, background: th.vars.panel2 }} />
                  <div style={{ position: 'absolute', right: 8, top: 8, width: 24, height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${th.vars.accent}, ${th.vars.accent2})` }} />
                  <div style={{ position: 'absolute', right: 8, bottom: 8, width: 14, height: 6, borderRadius: 3, background: th.vars.gold }} />
                </div>
                <span className="name">{th.name}</span>
                <PriceTag price={th.price} owned={owned} active={active} locked={th.unlockLevel} level={level} />
              </div>
            );
          })}
        </div>
      )}

      {tab === 'sigils' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
          {SIGILS.map((s) => {
            const owned = profile.ownedSigils.includes(s.id);
            const active = profile.sigil === s.id;
            const gated = s.unlockLevel !== undefined && level < s.unlockLevel;
            return (
              <div
                key={s.id}
                className={`shop-item ${active ? 'active' : ''} ${owned ? '' : 'locked'}`}
                onClick={() => (owned ? setSigil(s.id) : gated ? undefined : buySigil(s.id))}
              >
                <Sigil id={s.id} size={52} />
                <span className="name">{s.name}</span>
                <PriceTag price={s.price} owned={owned} active={active} locked={s.unlockLevel} level={level} />
              </div>
            );
          })}
        </div>
      )}

      {tab === 'titles' && (
        <div className="grid2">
          {TITLES.filter((t) => t.id !== 'none').map((t) => {
            const owned = profile.ownedTitles.includes(t.id);
            const active = profile.title === t.id;
            const gated = t.unlockLevel !== undefined && level < t.unlockLevel;
            return (
              <div
                key={t.id}
                className={`shop-item ${active ? 'active' : ''} ${owned ? '' : 'locked'}`}
                style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '13px 16px' }}
                onClick={() => (owned ? setTitle(active ? 'none' : t.id) : gated ? undefined : buyTitle(t.id))}
              >
                <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em', color: active ? 'var(--gold)' : undefined }}>
                  {profile.name} <span style={{ opacity: 0.85 }}>{t.label}</span>
                </span>
                <PriceTag price={t.price} owned={owned} active={active} locked={t.unlockLevel} level={level} />
              </div>
            );
          })}
        </div>
      )}

      {tab === 'effects' && (
        <>
          <h3 className="section-title"><Icon name="sparkle" size={13} /> Fonds ambiants</h3>
          <div className="grid2">
            {EFFECTS.filter((e) => e.kind === 'ambient').map((e) => {
              const usable = e.id === 'none' || effectAvailable(profile, level, e.id);
              const active = profile.ambientFx === e.id;
              const gated = e.unlockLevel !== undefined && level < e.unlockLevel;
              const freeUnlock = e.price === 0;
              return (
                <div
                  key={e.id}
                  className={`shop-item ${active ? 'active' : ''} ${usable ? '' : 'locked'}`}
                  style={{ alignItems: 'flex-start', textAlign: 'left' }}
                  onClick={() => (usable ? setAmbient(e.id) : gated || freeUnlock ? undefined : buyEffect(e.id))}
                >
                  <span className="name" style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <Icon name="sparkle" size={13} style={{ color: 'var(--accent)' }} /> {e.name}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>{e.desc}</span>
                  {usable ? (
                    <span className="muted" style={{ fontSize: 12 }}>{active ? '— actif —' : 'disponible'}</span>
                  ) : freeUnlock ? (
                    <span className="badge"><Icon name="lock" size={11} /> Niveau {e.unlockLevel}</span>
                  ) : (
                    <PriceTag price={e.price} owned={false} active={false} locked={e.unlockLevel} level={level} />
                  )}
                </div>
              );
            })}
          </div>
          <h3 className="section-title"><Icon name="bolt" size={13} /> Effets de complétion</h3>
          <div className="grid2">
            {EFFECTS.filter((e) => e.kind === 'burst').map((e) => {
              const usable = effectAvailable(profile, level, e.id);
              const active = profile.burstFx === e.id;
              const gated = e.unlockLevel !== undefined && level < e.unlockLevel;
              const freeUnlock = e.price === 0;
              return (
                <div
                  key={e.id}
                  className={`shop-item ${active ? 'active' : ''} ${usable ? '' : 'locked'}`}
                  style={{ alignItems: 'flex-start', textAlign: 'left' }}
                  onClick={() => (usable ? setBurst(e.id) : gated || freeUnlock ? undefined : buyEffect(e.id))}
                >
                  <span className="name" style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <Icon name="bolt" size={13} style={{ color: 'var(--accent2)' }} /> {e.name}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>{e.desc}</span>
                  {usable ? (
                    <span className="muted" style={{ fontSize: 12 }}>{active ? '— actif —' : 'disponible'}</span>
                  ) : freeUnlock ? (
                    <span className="badge"><Icon name="lock" size={11} /> Niveau {e.unlockLevel}</span>
                  ) : (
                    <PriceTag price={e.price} owned={false} active={false} locked={e.unlockLevel} level={level} />
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
