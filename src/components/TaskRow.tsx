// Ligne de tâche réutilisable (quêtes & quotidiennes) avec bouton de complétion.
import type { ReactNode } from 'react';
import { DIFFICULTIES, type Difficulty } from '../game/engine';
import { Icon } from './Icon';

export function DiffTag({ d }: { d: Difficulty }) {
  const def = DIFFICULTIES[d];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: def.color }}>
      <span className="diff-dot" style={{ background: def.color }} />
      {def.label}
    </span>
  );
}

export function CompleteButton({
  done,
  disabled,
  title,
  onClick,
}: {
  done: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      className={`complete-btn ${done ? 'done' : ''}`}
      disabled={disabled || done}
      title={title}
      onClick={onClick}
    >
      <Icon name="check" size={18} stroke={2.2} />
    </button>
  );
}

export function TaskCard({
  done,
  children,
  footer,
}: {
  done?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={`card hover ${done ? 'quest-done' : ''}`}>
      <div className="row" style={{ flexWrap: 'nowrap' }}>{children}</div>
      {footer}
    </div>
  );
}
