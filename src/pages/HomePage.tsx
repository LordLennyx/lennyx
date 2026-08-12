import { useStore } from '../store/useStore';
import { isScheduledOn, todayStr } from '../game/engine';
import { levelFromXp } from '../game/xp';
import { Icon } from '../components/Icon';
import { CompleteButton, DiffTag } from '../components/TaskRow';
import { rubrique } from '../game/library';

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 22 || h < 5) return 'La nuit veille sur toi';
  if (h >= 18) return 'Bonsoir';
  if (h >= 12) return 'Bon après-midi';
  return 'Bonjour';
}

export default function HomePage({ goTo }: { goTo: (p: string) => void }) {
  const { profile, quests, dailies, completeDaily, completeQuest } = useStore();
  const t = todayStr();
  const info = levelFromXp(profile.xp);

  const dueDailies = dailies.filter((d) => isScheduledOn(d.days, t));
  const doneToday = dueDailies.filter((d) => d.lastCompletedDate === t);
  const activeQuests = quests
    .filter((q) => !q.completedAt)
    .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
  const xpToday = profile.history[t] ?? 0;
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div>
      <h2 className="page-title">
        {greeting()}, {profile.name}
      </h2>
      <p className="page-sub">
        Encore {info.xpNeeded - info.xpInLevel} XP avant le niveau {Math.min(info.level + 1, 100)}.
      </p>

      <div className="card ornate row" style={{ gap: 24, flexWrap: 'wrap' }}>
        <div className="level-ring">
          <svg width="118" height="118" viewBox="0 0 118 118">
            <circle cx="59" cy="59" r={R} fill="none" stroke="var(--panel2)" strokeWidth="7" />
            <circle
              cx="59" cy="59" r={R} fill="none"
              stroke="url(#ringGrad)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - info.progress)}
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)' }}
            />
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--accent)" />
                <stop offset="1" stopColor="var(--accent2)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="ring-val">
            <b>{info.level}</b>
            <small>niveau</small>
          </div>
        </div>
        <div className="grow" style={{ minWidth: 220 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.08em', color: info.rank.color, display: 'flex', alignItems: 'center', gap: 9 }}>
            <Icon name={info.rank.icon} size={20} /> {info.rank.name}
          </div>
          <div className="stat-grid" style={{ marginTop: 14 }}>
            <div className="stat-tile">
              <div className="value"><Icon name="flame" size={19} style={{ color: '#e8964a' }} />{profile.currentStreak}</div>
              <div className="label">Streak</div>
            </div>
            <div className="stat-tile">
              <div className="value"><Icon name="bolt" size={19} style={{ color: 'var(--accent2)' }} />×{profile.combo || 0}</div>
              <div className="label">Combo</div>
            </div>
            <div className="stat-tile">
              <div className="value" style={{ color: 'var(--accent2)' }}>+{xpToday}</div>
              <div className="label">XP du jour</div>
            </div>
            <div className="stat-tile">
              <div className="value">{doneToday.length}<span className="muted" style={{ fontSize: 16 }}>/{dueDailies.length}</span></div>
              <div className="label">Quotidiennes</div>
            </div>
          </div>
        </div>
      </div>

      <h3 className="section-title"><Icon name="calendar" size={14} /> Aujourd'hui</h3>
      {dueDailies.length === 0 ? (
        <div className="card muted row">
          Aucune quotidienne programmée aujourd'hui.
          <button className="btn small" onClick={() => goTo('library')}>Explorer la bibliothèque</button>
        </div>
      ) : (
        dueDailies.map((d) => {
          const done = d.lastCompletedDate === t;
          const rub = rubrique(d.category);
          return (
            <div key={d.id} className={`card hover row keep-row ${done ? 'quest-done' : ''}`} style={{ flexWrap: 'nowrap' }}>
              <CompleteButton
                done={done}
                title={done ? 'Accomplie' : 'Accomplir'}
                onClick={(e) => completeDaily(d.id, { x: e.clientX, y: e.clientY })}
              />
              <div className="grow">
                <div className="quest-title" style={{ fontWeight: 700 }}>{d.title}</div>
                <div className="muted row" style={{ gap: 10, marginTop: 2 }}>
                  <DiffTag d={d.difficulty} />
                  {d.timeLimit && (
                    <span className="row" style={{ gap: 4 }}>
                      <Icon name="clock" size={12} /> avant {d.timeLimit}
                    </span>
                  )}
                  <span className="row" style={{ gap: 4 }}>
                    <Icon name="flame" size={12} /> ×{d.streak}
                  </span>
                  {rub && <span className="row" style={{ gap: 4 }}><Icon name={rub.icon} size={12} /> {rub.name}</span>}
                </div>
              </div>
            </div>
          );
        })
      )}

      <h3 className="section-title"><Icon name="sword" size={14} /> Quêtes en cours</h3>
      {activeQuests.length === 0 ? (
        <div className="card muted row">
          Aucune quête active.
          <button className="btn small" onClick={() => goTo('quests')}>Forger une quête</button>
        </div>
      ) : (
        activeQuests.slice(0, 5).map((q) => {
          const late = q.deadline && q.deadline < t;
          return (
            <div key={q.id} className="card hover row keep-row" style={{ flexWrap: 'nowrap' }}>
              <CompleteButton done={false} title="Accomplir" onClick={(e) => completeQuest(q.id, { x: e.clientX, y: e.clientY })} />
              <div className="grow">
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                  {q.type === 'event' && <Icon name="star" size={14} style={{ color: 'var(--gold)' }} />}
                  {q.title}
                </div>
                <div className="muted row" style={{ gap: 10, marginTop: 2 }}>
                  <DiffTag d={q.difficulty} />
                  {q.deadline && (
                    <span style={late ? { color: 'var(--danger)' } : undefined} className="row">
                      <Icon name="hourglass" size={12} />&nbsp;{q.deadline}{late ? ' — en retard' : ''}
                    </span>
                  )}
                  {q.subquests.length > 0 && `${q.subquests.filter((x) => x.done).length}/${q.subquests.length} étapes`}
                </div>
              </div>
            </div>
          );
        })
      )}
      {activeQuests.length > 5 && (
        <p style={{ marginTop: 10 }}>
          <button className="btn small" onClick={() => goTo('quests')}>
            Voir les {activeQuests.length} quêtes <Icon name="chevron" size={12} />
          </button>
        </p>
      )}
    </div>
  );
}
