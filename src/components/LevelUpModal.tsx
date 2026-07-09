import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from './Icon';

const COLORS = ['var(--gold)', 'var(--accent)', 'var(--accent2)', '#f4dd8c'];

export default function LevelUpModal() {
  const levelUp = useStore((s) => s.levelUp);
  const clear = useStore((s) => s.clearLevelUp);

  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        color: COLORS[i % COLORS.length],
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        dur: 2.2 + Math.random() * 2.2,
      })),
    [levelUp],
  );

  if (!levelUp) return null;

  return (
    <div className="overlay" onClick={clear}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <div className="levelup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lvl-icon">
          <Icon name={levelUp.rankIcon} size={62} stroke={1.2} />
        </div>
        <h2>NIVEAU {levelUp.level}</h2>
        {levelUp.rankChanged ? (
          <p style={{ fontSize: 15 }}>
            Nouveau rang : <strong style={{ color: 'var(--gold)' }}>{levelUp.rankName}</strong>
          </p>
        ) : (
          <p className="muted">Rang : {levelUp.rankName}</p>
        )}
        {levelUp.unlocks.length > 0 && (
          <div className="unlock-list">
            {levelUp.unlocks.map((u, i) => (
              <span key={i}>
                <Icon name="key" size={13} /> {u}
              </span>
            ))}
          </div>
        )}
        <button className="btn primary" style={{ marginTop: 20 }} onClick={clear}>
          Continuer l'ascension
        </button>
      </div>
    </div>
  );
}
