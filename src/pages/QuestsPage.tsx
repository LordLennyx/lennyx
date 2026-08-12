import { useState } from 'react';
import { useStore } from '../store/useStore';
import { DIFFICULTIES, DIFFICULTY_ORDER, todayStr, type Difficulty, type QuestType } from '../game/engine';
import type { Quest } from '../game/types';
import { Icon } from '../components/Icon';
import { CompleteButton, DiffTag } from '../components/TaskRow';
import { LIBRARY, rubrique } from '../game/library';

function QuestForm({ onClose }: { onClose: () => void }) {
  const addQuest = useStore((s) => s.addQuest);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [type, setType] = useState<QuestType>('quest');
  const [category, setCategory] = useState('');
  const [deadline, setDeadline] = useState('');
  const [subs, setSubs] = useState<string[]>(['']);

  const submit = () => {
    if (!title.trim()) return;
    addQuest({ title: title.trim(), description, type, difficulty, category: category || undefined, deadline, subquests: subs });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="form-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Forger une quête</h3>
        <input className="input" placeholder="Titre de la quête *" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" placeholder="Description (optionnel)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="row">
          <label className="grow">
            <span className="muted">Difficulté</span>
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              {DIFFICULTY_ORDER.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTIES[d].label} (+{DIFFICULTIES[d].questXp} XP)
                </option>
              ))}
            </select>
          </label>
          <label className="grow">
            <span className="muted">Type</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as QuestType)}>
              <option value="quest">Quête</option>
              <option value="event">Événement spécial (récompense ×2)</option>
            </select>
          </label>
        </div>
        <div className="row">
          <label className="grow">
            <span className="muted">Rubrique (optionnel)</span>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">—</option>
              {LIBRARY.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className="grow">
            <span className="muted">Échéance (optionnel)</span>
            <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
        </div>
        <div>
          <span className="muted">Sous-quêtes (étapes)</span>
          {subs.map((sub, i) => (
            <div className="row keep-row" key={i} style={{ marginTop: 6, flexWrap: 'nowrap' }}>
              <input
                className="input grow"
                placeholder={`Étape ${i + 1}`}
                value={sub}
                onChange={(e) => setSubs(subs.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button className="btn small danger icon-only" onClick={() => setSubs(subs.filter((_, j) => j !== i))}>
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
          <button className="btn small" style={{ marginTop: 8 }} onClick={() => setSubs([...subs, ''])}>
            <Icon name="plus" size={13} /> Ajouter une étape
          </button>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={submit} disabled={!title.trim()}>Forger</button>
        </div>
      </div>
    </div>
  );
}

function QuestCard({ quest }: { quest: Quest }) {
  const { completeQuest, deleteQuest, toggleSubquest } = useStore();
  const done = !!quest.completedAt;
  const late = !done && quest.deadline && quest.deadline < todayStr();
  const rub = rubrique(quest.category);

  return (
    <div className={`card hover ${done ? 'quest-done' : ''}`}>
      <div className="row keep-row" style={{ flexWrap: 'nowrap' }}>
        <CompleteButton
          done={done}
          title={done ? 'Accomplie' : 'Accomplir la quête'}
          onClick={(e) => completeQuest(quest.id, { x: e.clientX, y: e.clientY })}
        />
        <div className="grow">
          <div className="quest-title" style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>
            {quest.type === 'event' && <Icon name="star" size={14} style={{ color: 'var(--gold)' }} />}
            {quest.title}
          </div>
          {quest.description && <div className="muted">{quest.description}</div>}
          <div className="muted row" style={{ marginTop: 3, gap: 10 }}>
            <DiffTag d={quest.difficulty} />
            {rub && <span className="row" style={{ gap: 4 }}><Icon name={rub.icon} size={12} /> {rub.name}</span>}
            {quest.deadline && (
              <span style={late ? { color: 'var(--danger)' } : undefined} className="row">
                <Icon name="hourglass" size={12} />&nbsp;{quest.deadline}{late ? ' — en retard' : ''}
              </span>
            )}
            {done && quest.xpAwarded != null && (
              <span style={{ color: 'var(--accent2)' }}>+{quest.xpAwarded} XP · +{quest.goldAwarded} or</span>
            )}
          </div>
        </div>
        <button className="btn small danger icon-only" onClick={() => deleteQuest(quest.id)} title="Supprimer">
          <Icon name="trash" size={14} />
        </button>
      </div>
      {quest.subquests.length > 0 && (
        <div style={{ marginTop: 10, paddingLeft: 54, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {quest.subquests.map((sub) => (
            <label key={sub.id} className="row" style={{ cursor: done ? 'default' : 'pointer', gap: 9 }}>
              <input type="checkbox" checked={sub.done} disabled={done} onChange={() => toggleSubquest(quest.id, sub.id)} />
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
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 className="page-title">Quêtes</h2>
        <button className="btn primary" onClick={() => setShowForm(true)}>
          <Icon name="plus" size={14} /> Nouvelle quête
        </button>
      </div>
      <p className="page-sub">Chaque quête accomplie forge ta légende.</p>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className={`chip ${tab === 'active' ? 'on' : ''}`} onClick={() => setTab('active')}>
          En cours ({active.length})
        </button>
        <button className={`chip ${tab === 'done' ? 'on' : ''}`} onClick={() => setTab('done')}>
          Accomplies ({done.length})
        </button>
      </div>
      {list.length === 0 ? (
        <div className="card muted">
          {tab === 'active' ? 'Aucune quête en cours — le tableau attend ta première conquête.' : 'Aucune quête accomplie pour le moment.'}
        </div>
      ) : (
        list.map((q) => <QuestCard key={q.id} quest={q} />)
      )}
      {showForm && <QuestForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
