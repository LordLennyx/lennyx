// Batterie du moteur d'humeur (src/game/mood.ts).
// Lancée par `npm test` ; LENNYX_TEST_BUILD pointe sur les modules compilés.
const path = require('path');
const BUILD = process.env.LENNYX_TEST_BUILD;
if (!BUILD) throw new Error('LENNYX_TEST_BUILD absent — lance `npm test`.');
const { computeMood, dayProgress, MOODS } = require(path.join(BUILD, 'game/mood.js'));

const TODAY = '2026-10-28'; // mercredi
let pass = 0;
const fails = [];

function check(label, cond, detail = '') {
  if (cond) { pass++; return true; }
  fails.push(`${label}${detail ? `\n     ${detail}` : ''}`);
  return false;
}
function eq(label, got, want) {
  return check(label, JSON.stringify(got) === JSON.stringify(want), `attendu ${JSON.stringify(want)}, obtenu ${JSON.stringify(got)}`);
}

// ── fabriques ──
function profile(patch = {}) {
  return {
    name: 'Lens', currentStreak: 0, combo: 0, lastActiveDate: TODAY,
    steps: { goal: 8000, counted: {}, native: {}, manual: {}, bestDay: 0 },
    history: {},
    ...patch,
  };
}
function daily(patch = {}) {
  return { id: Math.random().toString(36), title: 'Tâche', difficulty: 'normal', days: [], completions: [], times: {}, lateDates: [], streak: 0, bestStreak: 0, createdAt: TODAY, ...patch };
}
function quest(patch = {}) {
  return { id: Math.random().toString(36), title: 'Quête', type: 'quest', difficulty: 'normal', subquests: [], createdAt: TODAY, ...patch };
}
const mood = (ctx, nowMinutes) => computeMood(
  { profile: ctx.profile ?? profile(), quests: ctx.quests ?? [], dailies: ctx.dailies ?? [] },
  { today: TODAY, nowMinutes },
);

// ═══════ 1. la courbe d'attente ═══════
eq('attente à 6 h = 0 %', Math.round(dayProgress(6 * 60) * 100), 0);
eq('attente à 14 h ≈ 50 %', Math.round(dayProgress(14 * 60) * 100), 50);
eq('attente à 22 h = 100 %', Math.round(dayProgress(22 * 60) * 100), 100);
eq('attente à 3 h du matin bornée à 0', dayProgress(3 * 60), 0);
eq('attente à 23 h bornée à 100 %', dayProgress(23 * 60), 1);

// ═══════ 2. indulgence du matin / sévérité du soir ═══════
const fiveDailies = [daily(), daily(), daily(), daily(), daily()];
const morning = mood({ dailies: fiveDailies }, 7 * 60);
const evening = mood({ dailies: fiveDailies }, 21 * 60);
check('0/5 à 7 h du matin n’est pas une humeur basse',
  morning.score >= 45, `score matin = ${morning.score} (${morning.id})`);
check('0/5 à 21 h est une humeur basse',
  evening.score < 35, `score soir = ${evening.score} (${evening.id})`);
check('le soir est plus sévère que le matin, à situation identique',
  evening.score < morning.score, `matin ${morning.score} / soir ${evening.score}`);

// ═══════ 3. monotonie : faire plus ne doit jamais faire baisser ═══════
let previous = -1;
let monotone = true;
const scores = [];
for (let done = 0; done <= 5; done++) {
  const list = fiveDailies.map((d, i) => daily({ ...d, lastCompletedDate: i < done ? TODAY : undefined }));
  const s = mood({ dailies: list }, 14 * 60).score;
  scores.push(s);
  if (s < previous) monotone = false;
  previous = s;
}
check('score croissant avec le nombre de tâches faites', monotone, `scores = ${scores.join(', ')}`);

// ═══════ 4. journée parfaite → humeur haute ═══════
const perfect = mood({
  profile: profile({ currentStreak: 12, combo: 6, history: { [TODAY]: 200, '2026-10-27': 180, '2026-10-26': 150 }, steps: { goal: 8000, counted: { [TODAY]: 9000 }, native: {}, manual: {}, bestDay: 9000 } }),
  dailies: fiveDailies.map((d) => daily({ ...d, lastCompletedDate: TODAY })),
}, 20 * 60);
check('journée parfaite + streak + pas → glorieux ou fier',
  ['glorieux', 'fier'].includes(perfect.id), `obtenu ${perfect.id} (${perfect.score})\n     ${perfect.reasons.join(' | ')}`);

// ═══════ 5. retards ═══════
const late = mood({
  dailies: [daily({ timeLimit: '08:00' }), daily({ timeLimit: '09:00' }), daily()],
  quests: [quest({ deadline: '2026-10-20' })],
}, 18 * 60);
eq('trois retards comptés (2 chronométrées + 1 quête)', late.lateCount, 3);
check('les retards tirent l’humeur vers le bas', late.score < 40, `score = ${late.score}`);

const notLateYet = mood({ dailies: [daily({ timeLimit: '20:00' })] }, 10 * 60);
eq('une chronométrée dont l’heure n’est pas passée n’est pas un retard', notLateYet.lateCount, 0);

// ═══════ 6. désertion ═══════
const deserted = mood({
  profile: profile({ lastActiveDate: '2026-10-20', currentStreak: 0, history: {} }),
  dailies: fiveDailies.map((d) => daily({ ...d, lastCompletedDate: TODAY })),
}, 20 * 60);
check('inactif depuis une semaine → humeur plafonnée, jamais glorieuse',
  deserted.score <= 24 && ['inquiet', 'eteint'].includes(deserted.id),
  `obtenu ${deserted.id} (${deserted.score})`);

const yesterdayActive = mood({ profile: profile({ lastActiveDate: '2026-10-27', currentStreak: 3 }), dailies: [] }, 12 * 60);
check('actif hier → pas de plafonnement', yesterdayActive.score > 24, `score = ${yesterdayActive.score}`);

// ═══════ 7. bornes et cohérence ═══════
for (const nowMin of [0, 6 * 60, 12 * 60, 18 * 60, 23 * 60 + 59]) {
  for (const done of [0, 3, 5]) {
    const list = fiveDailies.map((d, i) => daily({ ...d, lastCompletedDate: i < done ? TODAY : undefined }));
    const s = mood({ dailies: list }, nowMin);
    check(`score borné 0..100 (${nowMin} min, ${done} faites)`, s.score >= 0 && s.score <= 100, `score = ${s.score}`);
    check(`humeur résolue (${nowMin} min, ${done} faites)`, MOODS.some((m) => m.id === s.id), `id = ${s.id}`);
  }
}

// ═══════ 8. mise en avant : rubrique, difficulté, prochaine tâche ═══════
const focus = mood({
  dailies: [
    daily({ title: 'Réviser', category: 'etudes', difficulty: 'hard', timeLimit: '18:00' }),
    daily({ title: 'Courir', category: 'sport', difficulty: 'easy' }),
    daily({ title: 'Devoirs', category: 'etudes', difficulty: 'normal' }),
  ],
  quests: [quest({ title: 'Mémoire', category: 'etudes', difficulty: 'epic', deadline: '2026-11-30' })],
}, 10 * 60);
eq('rubrique dominante du restant', focus.domain, 'etudes');
eq('difficulté la plus haute du restant', focus.hardest, 'epic');
eq('prochaine tâche = la chronométrée la plus proche', focus.nextTask, 'Réviser');

const noTimed = mood({ quests: [quest({ title: 'Urgent', deadline: '2026-10-29' }), quest({ title: 'Plus tard', deadline: '2026-12-01' })] }, 10 * 60);
eq('sans chronométrée, la quête la plus proche passe devant', noTimed.nextTask, 'Urgent');

// ═══════ 9. phrase du jour stable ═══════
const a = mood({ dailies: fiveDailies }, 12 * 60);
const b = mood({ dailies: fiveDailies }, 12 * 60);
eq('la phrase ne change pas entre deux rendus identiques', a.line, b.line);
check('la phrase appartient bien à l’humeur retenue',
  MOODS.find((m) => m.id === a.id).lines.includes(a.line), `phrase = « ${a.line} »`);

// ═══════ 10. journée sans quotidienne programmée ═══════
const empty = mood({ profile: profile({ currentStreak: 4 }), dailies: [daily({ days: [0] })] }, 14 * 60); // dimanche uniquement
eq('aucune quotidienne programmée → rien n’est reproché', empty.totalToday, 0);
check('journée vide reste neutre ou mieux', empty.score >= 45, `score = ${empty.score} (${empty.id})`);

// ═══════ 11. tout premier jour : accueil, pas reproche ═══════
const fresh = () => ({ name: 'Lens', currentStreak: 0, combo: 0, steps: { goal: 8000, counted: {}, native: {}, manual: {}, bestDay: 0 }, history: {} });
const brandNew = computeMood({ profile: fresh(), quests: [], dailies: [] }, { today: TODAY, nowMinutes: 14 * 60 });
check('profil tout neuf → ni inquiet ni éteint',
  !['inquiet', 'eteint'].includes(brandNew.id), `obtenu ${brandNew.id} (${brandNew.score})`);
check('profil tout neuf → au moins serein', brandNew.score >= 54, `score = ${brandNew.score}`);

const brandNewEvening = computeMood({ profile: fresh(), quests: [], dailies: fiveDailies }, { today: TODAY, nowMinutes: 21 * 60 });
check('premier jour au soir → pas de visage inquiet',
  !['inquiet', 'eteint'].includes(brandNewEvening.id), `obtenu ${brandNewEvening.id} (${brandNewEvening.score})`);

// ═══════ verdict ═══════
console.log(`\n${pass} vérifications passées, ${fails.length} échec(s)\n`);
if (fails.length > 0) {
  for (const f of fails) console.log(' ✗ ' + f);
  process.exit(1);
}
console.log('✓ moteur d’humeur conforme');
