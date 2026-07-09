import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  WEEKDAYS,
  isScheduledOn,
  todayStr,
  type Difficulty,
} from '../game/engine';

function DailyForm({ onClose }: { onClose: () => void }) {
  const addDaily = useStore((s) => s.addDaily);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [days, setDays] = useState<number[]>([]);

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const submit = () => {
    if (!title.trim()) return;
    addDaily({ title: title.trim(), description, difficulty, days });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="form-modal" onClick={(e) => e.stopPropagation()}>
        <h3>📅 Nouvelle quête quotidienne</h3>
        <input
          className="input"
          placeholder="Titre *"
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
        <label>
          <span className="muted">Difficulté</span>
          <select
            className="input"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            {DIFFICULTY_ORDER.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTIES[d].icon} {DIFFICULTIES[d].label} (+{DIFFICULTIES[d].dailyXp} XP)
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="muted">Jours programmés (aucun = tous les jours)</span>
          <div className="row" style={{ marginTop: 6 }}>
            {WEEKDAYS.map((w) => (
              <button
                key={w.id}
                className={`chip ${days.includes(w.id) ? 'on' : ''}`}
                onClick={() => toggleDay(w.id)}
              >
                {w.short}
              </button>
            ))}
          </div>
        </div>
        <p className="muted">
          ⚠️ Une quotidienne manquée un jour programmé casse son streak et fait perdre de l'XP.
        </p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" onClick={submit} disabled={!title.trim()}>
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DailiesPage() {
  const { dailies, completeDaily, deleteDaily } = useStore();
  const [showForm, setShowForm] = useState(false);
  const t = todayStr();

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 className="page-title" style={{ marginBottom: 0 }}>
          📅 Quêtes quotidiennes
        </h2>
        <button className="btn primary" onClick={() => setShowForm(true)}>
          + Nouvelle quotidienne
        </button>
      </div>

      {dailies.length === 0 ? (
        <div className="card muted">
          Les quêtes quotidiennes construisent tes streaks 🔥 — crée ta première routine !
        </div>
      ) : (
        dailies.map((d) => {
          const scheduledToday = isScheduledOn(d.days, t);
          const done = d.lastCompletedDate === t;
          return (
            <div key={d.id} className={`card ${done ? 'quest-done' : ''}`}>
              <div className="row">
                <button
                  className={`complete-btn ${done ? 'done' : ''}`}
                  onClick={() => completeDaily(d.id)}
                  disabled={!scheduledToday && !done}
                  title={
                    done ? 'Accomplie aujourd’hui' : scheduledToday ? 'Accomplir' : 'Pas programmée aujourd’hui'
                  }
                  style={!scheduledToday && !done ? { opacity: 0.35 } : undefined}
                >
                  {done ? '✓' : ''}
                </button>
                <div className="grow">
                  <div className="quest-title" style={{ fontWeight: 700, fontSize: 15 }}>
                    {d.title}
                  </div>
                  {d.description && <div className="muted">{d.description}</div>}
                  <div className="muted" style={{ marginTop: 3 }}>
                    {DIFFICULTIES[d.difficulty].icon} {DIFFICULTIES[d.difficulty].label} · 🔥 streak x
                    {d.streak} · 🏅 record x{d.bestStreak}
                  </div>
                </div>
                <button className="btn small danger" onClick={() => deleteDaily(d.id)} title="Supprimer">
                  🗑️
                </button>
              </div>
              <div className="row" style={{ marginTop: 10, paddingLeft: 54 }}>
                {WEEKDAYS.map((w) => (
                  <span
                    key={w.id}
                    className={`chip readonly ${d.days.length === 0 || d.days.includes(w.id) ? 'on' : ''}`}
                    style={{ fontSize: 10, padding: '3px 7px' }}
                  >
                    {w.short}
                  </span>
                ))}
              </div>
            </div>
          );
        })
      )}
      {showForm && <DailyForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
