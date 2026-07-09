import { useMemo } from 'react';
import { useStore } from '../store/useStore';

const CONFETTI = ['🎉', '✨', '⭐', '💜', '🔷', '🟡'];

export default function LevelUpModal() {
  const levelUp = useStore((s) => s.levelUp);
  const clear = useStore((s) => s.clearLevelUp);

  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        emoji: CONFETTI[i % CONFETTI.length],
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2 + Math.random() * 2,
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
          style={{ left: `${p.left}%`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
        >
          {p.emoji}
        </span>
      ))}
      <div className="levelup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="big">{levelUp.rankIcon}</div>
        <h2>NIVEAU {levelUp.level} !</h2>
        {levelUp.rankChanged ? (
          <p style={{ fontSize: 16 }}>
            Nouveau rang : <strong>{levelUp.rankName}</strong> 🎖️
          </p>
        ) : (
          <p className="muted">
            Rang actuel : {levelUp.rankIcon} {levelUp.rankName}
          </p>
        )}
        <button className="btn primary" style={{ marginTop: 18 }} onClick={clear}>
          Continuer l'aventure
        </button>
      </div>
    </div>
  );
}
