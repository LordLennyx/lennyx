import { useStore } from '../store/useStore';
import { isScheduledOn, todayStr, DIFFICULTIES } from '../game/engine';
import { levelFromXp } from '../game/xp';

const GREETINGS = [
  [5, 'Bonne matinée'],
  [12, 'Bon après-midi'],
  [18, 'Bonne soirée'],
  [22, 'Bonne nuit'],
] as const;

function greeting(): string {
  const h = new Date().getHours();
  for (let i = GREETINGS.length - 1; i >= 0; i--) {
    if (h >= GREETINGS[i][0]) return GREETINGS[i][1];
  }
  return 'Bonne nuit';
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

  return (
    <div>
      <h2 className="page-title">
        {greeting()}, {profile.name} 👋
      </h2>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="value">🔥 {profile.currentStreak}</div>
          <div className="label">Streak global</div>
        </div>
        <div className="stat-tile">
          <div className="value">⚡ x{profile.combo || 0}</div>
          <div className="label">Combo du jour</div>
        </div>
        <div className="stat-tile">
          <div className="value" style={{ color: 'var(--accent2)' }}>
            +{xpToday}
          </div>
          <div className="label">XP aujourd'hui</div>
        </div>
        <div className="stat-tile">
          <div className="value">
            {doneToday.length}/{dueDailies.length}
          </div>
          <div className="label">Quotidiennes du jour</div>
        </div>
      </div>

      <h3 className="section-title">📅 Quotidiennes d'aujourd'hui</h3>
      {dueDailies.length === 0 ? (
        <div className="card muted">
          Aucune quête quotidienne programmée aujourd'hui.{' '}
          <button className="btn small" onClick={() => goTo('dailies')}>
            En créer une
          </button>
        </div>
      ) : (
        dueDailies.map((d) => {
          const done = d.lastCompletedDate === t;
          return (
            <div key={d.id} className={`card row ${done ? 'quest-done' : ''}`}>
              <button
                className={`complete-btn ${done ? 'done' : ''}`}
                onClick={() => completeDaily(d.id)}
                title={done ? 'Déjà accomplie' : 'Accomplir'}
              >
                {done ? '✓' : ''}
              </button>
              <div className="grow">
                <div className="quest-title" style={{ fontWeight: 700 }}>
                  {d.title}
                </div>
                <div className="muted">
                  {DIFFICULTIES[d.difficulty].icon} {DIFFICULTIES[d.difficulty].label} · 🔥 streak x
                  {d.streak}
                </div>
              </div>
            </div>
          );
        })
      )}

      <h3 className="section-title">⚔️ Quêtes en cours</h3>
      {activeQuests.length === 0 ? (
        <div className="card muted">
          Aucune quête active. Le tableau des quêtes t'attend !{' '}
          <button className="btn small" onClick={() => goTo('quests')}>
            Nouvelle quête
          </button>
        </div>
      ) : (
        activeQuests.slice(0, 5).map((q) => {
          const late = q.deadline && q.deadline < t;
          return (
            <div key={q.id} className="card row">
              <button className="complete-btn" onClick={() => completeQuest(q.id)} title="Accomplir">
                {''}
              </button>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>
                  {q.type === 'event' ? '🌟 ' : ''}
                  {q.title}
                </div>
                <div className="muted">
                  {DIFFICULTIES[q.difficulty].icon} {DIFFICULTIES[q.difficulty].label}
                  {q.deadline && (
                    <span style={late ? { color: 'var(--danger)' } : undefined}>
                      {' '}
                      · ⏰ {q.deadline}
                      {late ? ' (en retard !)' : ''}
                    </span>
                  )}
                  {q.subquests.length > 0 &&
                    ` · ${q.subquests.filter((x) => x.done).length}/${q.subquests.length} étapes`}
                </div>
              </div>
            </div>
          );
        })
      )}
      {activeQuests.length > 5 && (
        <p style={{ marginTop: 10 }}>
          <button className="btn small" onClick={() => goTo('quests')}>
            Voir les {activeQuests.length} quêtes →
          </button>
        </p>
      )}

      <div className="card" style={{ marginTop: 22, textAlign: 'center' }}>
        <span className="muted">
          Encore <strong style={{ color: 'var(--text)' }}>{info.xpNeeded - info.xpInLevel} XP</strong>{' '}
          avant le niveau {Math.min(info.level + 1, 100)} — tu peux le faire 💪
        </span>
      </div>
    </div>
  );
}
