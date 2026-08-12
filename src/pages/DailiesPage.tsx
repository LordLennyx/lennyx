import { useState } from 'react';
import { useStore } from '../store/useStore';
import { DIFFICULTIES, DIFFICULTY_ORDER, WEEKDAYS, isScheduledOn, todayStr, type Difficulty } from '../game/engine';
import { Icon } from '../components/Icon';
import { CompleteButton, DiffTag } from '../components/TaskRow';
import { LIBRARY, rubrique } from '../game/library';

function DailyForm({ onClose }: { onClose: () => void }) {
  const addDaily = useStore((s) => s.addDaily);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [category, setCategory] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [timed, setTimed] = useState(false);
  const [timeLimit, setTimeLimit] = useState('08:00');

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const submit = () => {
    if (!title.trim()) return;
    addDaily({
      title: title.trim(), description, difficulty,
      category: category || undefined, days,
      timeLimit: timed ? timeLimit : undefined,
    });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="form-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nouvelle quotidienne</h3>
        <input className="input" placeholder="Titre *" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" placeholder="Description (optionnel)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="row">
          <label className="grow">
            <span className="muted">Difficulté</span>
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              {DIFFICULTY_ORDER.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTIES[d].label} (+{DIFFICULTIES[d].dailyXp} XP)
                </option>
              ))}
            </select>
          </label>
          <label className="grow">
            <span className="muted">Rubrique</span>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">—</option>
              {LIBRARY.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <span className="muted">Jours programmés (aucun = tous les jours)</span>
          <div className="row" style={{ marginTop: 6 }}>
            {WEEKDAYS.map((w) => (
              <button key={w.id} className={`chip ${days.includes(w.id) ? 'on' : ''}`} onClick={() => toggleDay(w.id)}>
                {w.short}
              </button>
            ))}
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
            <span className="row" style={{ gap: 5 }}><Icon name="clock" size={14} /> Chronométrée — valider avant</span>
          </label>
          {timed && (
            <input className="input" type="time" style={{ width: 110 }} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
          )}
        </div>
        <p className="muted">
          Une quotidienne manquée brise son streak et coûte de l'XP. Une chronométrée validée à l'heure
          rapporte un bonus de ponctualité de 25 % ; en retard, la récompense est réduite de moitié.
        </p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={submit} disabled={!title.trim()}>Créer</button>
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
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 className="page-title">Quotidiennes</h2>
        <button className="btn primary" onClick={() => setShowForm(true)}>
          <Icon name="plus" size={14} /> Nouvelle quotidienne
        </button>
      </div>
      <p className="page-sub">Les rituels bâtissent les empires — protège tes streaks.</p>

      {dailies.length === 0 ? (
        <div className="card muted">
          Les quotidiennes construisent tes streaks. Crée ta première routine, ou pioche dans la Bibliothèque.
        </div>
      ) : (
        dailies.map((d) => {
          const scheduledToday = isScheduledOn(d.days, t);
          const done = d.lastCompletedDate === t;
          const rub = rubrique(d.category);
          return (
            <div key={d.id} className={`card hover ${done ? 'quest-done' : ''}`}>
              <div className="row keep-row" style={{ flexWrap: 'nowrap' }}>
                <CompleteButton
                  done={done}
                  disabled={!scheduledToday}
                  title={done ? 'Accomplie aujourd’hui' : scheduledToday ? 'Accomplir' : 'Pas programmée aujourd’hui'}
                  onClick={(e) => completeDaily(d.id, { x: e.clientX, y: e.clientY })}
                />
                <div className="grow">
                  <div className="quest-title" style={{ fontWeight: 700, fontSize: 15 }}>{d.title}</div>
                  {d.description && <div className="muted">{d.description}</div>}
                  <div className="muted row" style={{ marginTop: 3, gap: 10 }}>
                    <DiffTag d={d.difficulty} />
                    {d.timeLimit && (
                      <span className="row" style={{ gap: 4 }}>
                        <Icon name="clock" size={12} /> avant {d.timeLimit}
                      </span>
                    )}
                    <span className="row" style={{ gap: 4 }}><Icon name="flame" size={12} /> ×{d.streak}</span>
                    <span className="row" style={{ gap: 4 }}><Icon name="medal" size={12} /> record ×{d.bestStreak}</span>
                    {rub && <span className="row" style={{ gap: 4 }}><Icon name={rub.icon} size={12} /> {rub.name}</span>}
                  </div>
                </div>
                <button className="btn small danger icon-only" onClick={() => deleteDaily(d.id)} title="Supprimer">
                  <Icon name="trash" size={14} />
                </button>
              </div>
              <div className="row" style={{ marginTop: 10, paddingLeft: 54 }}>
                {WEEKDAYS.map((w) => (
                  <span
                    key={w.id}
                    className={`chip readonly ${d.days.length === 0 || d.days.includes(w.id) ? 'on' : ''}`}
                    style={{ fontSize: 10, padding: '3px 8px' }}
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
