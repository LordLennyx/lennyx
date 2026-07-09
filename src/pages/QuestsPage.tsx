import { useState } from 'react';
import { useStore } from '../store/useStore';
import { DIFFICULTIES, DIFFICULTY_ORDER, todayStr, type Difficulty, type QuestType } from '../game/engine';
import type { Quest } from '../game/types';

function QuestForm({ onClose }: { onClose: () => void }) {
  const addQuest = useStore((s) => s.addQuest);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [type, setType] = useState<QuestType>('quest');
  const [deadline, setDeadline] = useState('');
  const [subs, setSubs] = useState<string[]>(['']);

  const submit = () => {
    if (!title.trim()) return;
    addQuest({ title: title.trim(), description, type, difficulty, deadline, subquests: subs });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="form-modal" onClick={(e) => e.stopPropagation()}>
        <h3>⚔️ Nouvelle quête</h3>
        <input
          className="input"
          placeholder="Titre de la quête *"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input"
          placeholder="Description (optionnel)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="row">
          <label className="grow">
            <span className="muted">Difficulté</span>
            <select
              className="input"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              {DIFFICULTY_ORDER.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTIES[d].icon} {DIFFICULTIES[d].label} (+{DIFFICULTIES[d].questXp} XP)
                </option>
              ))}
            </select>
          </label>
          <label className="grow">
            <span className="muted">Type</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as QuestType)}>
              <option value="quest">⚔️ Quête</option>
              <option value="event">🌟 Événement spécial (x2)</option>
            </select>
          </label>
        </div>
        <label>
          <span className="muted">Échéance (optionnel)</span>
          <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <div>
          <span className="muted">Sous-quêtes (étapes)</span>
          {subs.map((sub, i) => (
            <div className="row" key={i} style={{ marginTop: 6 }}>
              <input
                className="input grow"
                placeholder={`Étape ${i + 1}`}
                value={sub}
                onChange={(e) => setSubs(subs.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button className="btn small danger" onClick={() => setSubs(subs.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button className="btn small" style={{ marginTop: 6 }} onClick={() => setSubs([...subs, ''])}>
            + Ajouter une étape
          </button>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" onClick={submit} disabled={!title.trim()}>
            Créer la quête
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestCard({ quest }: { quest: Quest }) {
  const { completeQuest, deleteQuest, toggleSubquest } = useStore();
  const done = !!quest.completedAt;
  const late = !done && quest.deadline && quest.deadline < todayStr();

  return (
    <div className={`card ${done ? 'quest-done' : ''}`}>
      <div className="row">
        <button
          className={`complete-btn ${done ? 'done' : ''}`}
          onClick={() => completeQuest(quest.id)}
          title={done ? 'Accomplie' : 'Accomplir la quête'}
        >
          {done ? '✓' : ''}
        </button>
        <div className="grow">
          <div className="quest-title" style={{ fontWeight: 700, fontSize: 15 }}>
            {quest.type === 'event' ? '🌟 ' : ''}
            {quest.title}
          </div>
          {quest.description && <div className="muted">{quest.description}</div>}
          <div className="muted" style={{ marginTop: 3 }}>
            {DIFFICULTIES[quest.difficulty].icon} {DIFFICULTIES[quest.difficulty].label}
            {quest.deadline && (
              <span style={late ? { color: 'var(--danger)' } : undefined}>
                {' '}
                · ⏰ {quest.deadline}
                {late ? ' (en retard !)' : ''}
              </span>
            )}
            {done && quest.xpAwarded != null && (
              <span style={{ color: 'var(--accent2)' }}>
                {' '}
                · +{quest.xpAwarded} XP · +{quest.goldAwarded} 🪙
              </span>
            )}
          </div>
        </div>
        <button className="btn small danger" onClick={() => deleteQuest(quest.id)} title="Supprimer">
          🗑️
        </button>
      </div>
      {quest.subquests.length > 0 && (
        <div style={{ marginTop: 10, paddingLeft: 54, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {quest.subquests.map((sub) => (
            <label key={sub.id} className="row" style={{ cursor: done ? 'default' : 'pointer', gap: 8 }}>
              <input
                type="checkbox"
                checked={sub.done}
                disabled={done}
                onChange={() => toggleSubquest(quest.id, sub.id)}
              />
              <span style={sub.done ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}>
                {sub.title}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuestsPage() {
  const quests = useStore((s) => s.quests);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'active' | 'done'>('active');

  const active = quests.filter((q) => !q.completedAt);
  const done = quests.filter((q) => q.completedAt);
  const list = tab === 'active' ? active : done;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 className="page-title" style={{ marginBottom: 0 }}>
          ⚔️ Quêtes
        </h2>
        <button className="btn primary" onClick={() => setShowForm(true)}>
          + Nouvelle quête
        </button>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className={`chip ${tab === 'active' ? 'on' : ''}`} onClick={() => setTab('active')}>
          En cours ({active.length})
        </button>
        <button className={`chip ${tab === 'done' ? 'on' : ''}`} onClick={() => setTab('done')}>
          Accomplies ({done.length})
        </button>
      </div>
      {list.length === 0 ? (
        <div className="card muted">
          {tab === 'active'
            ? 'Aucune quête en cours. Crée ta première quête et lance ton aventure ! 🚀'
            : 'Aucune quête accomplie pour le moment.'}
        </div>
      ) : (
        list.map((q) => <QuestCard key={q.id} quest={q} />)
      )}
      {showForm && <QuestForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
