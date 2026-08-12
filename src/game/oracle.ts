// ── L'Oracle v2 : analyste, devin et encyclopédie de Lennyx ───────────────
// 100 % local : il raisonne sur TES données (ponctualité historique, journal
// de réveil, pas, sessions chronométrées, rubriques) pour répondre
// honnêtement, prédire tes chances et composer tes journées.

import type { Daily, NoteEntry, Profile, Quest, TimeLogEntry, Transaction } from './types';
import type { Difficulty } from './engine';
import { isScheduledOn, todayStr, addDays } from './engine';
import { LIBRARY, type TaskTemplate } from './library';
import { levelFromXp, xpForLevel } from './xp';
import { ACHIEVEMENTS } from './content';

export interface OracleContext {
  profile: Profile;
  quests: Quest[];
  dailies: Daily[];
  timeLog: TimeLogEntry[];
  notes: NoteEntry[];
  transactions: Transaction[];
}

export interface OracleAction {
  kind: 'add-quest' | 'add-daily' | 'generate-day';
  payload?: {
    title?: string;
    difficulty?: Difficulty;
    days?: number[];
    timeLimit?: string;
    isEvent?: boolean;
    rubriques?: string[];
    count?: number; // nombre de tâches à générer (generate-day)
  };
}

export interface OracleReply {
  text: string;
  actions?: OracleAction[];
}

// ═══════════════ utilitaires d'analyse ═══════════════

const hmToMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};
const minToHm = (min: number) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.round(min) % 60).padStart(2, '0')}`;

function avgHm(times: string[]): string | null {
  if (times.length === 0) return null;
  return minToHm(times.reduce((a, t) => a + hmToMin(t), 0) / times.length);
}

/** Normalisation pour la recherche floue (minuscules, sans accents). */
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Trouve la quotidienne dont le titre recouvre le mieux la question. */
export function findDaily(query: string, dailies: Daily[]): Daily | null {
  const qWords = norm(query).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  let best: Daily | null = null;
  let bestScore = 0;
  for (const d of dailies) {
    const tWords = new Set(norm(d.title).split(/[^a-z0-9]+/).filter((w) => w.length > 2));
    let score = 0;
    for (const w of qWords) if (tWords.has(w)) score++;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return bestScore >= 2 ? best : bestScore === 1 && dailies.length <= 3 ? best : null;
}

export interface PunctualityStats {
  scheduled: number;
  done: number;
  onTime: number;
  late: number;
  missed: number;
  rate: number; // 0..1 sur les occurrences programmées
  avgDoneTime: string | null;
  recentTrend: number; // taux sur les 7 dernières occurrences
}

/** Bilan de fiabilité d'une quotidienne sur ses 30 dernières occurrences. */
export function punctuality(d: Daily): PunctualityStats {
  const t = todayStr();
  const doneSet = new Set(d.completions);
  const lateSet = new Set(d.lateDates ?? []);
  const occ: Array<{ date: string; done: boolean; late: boolean }> = [];
  let day = addDays(t, -1);
  for (let i = 0; i < 120 && occ.length < 30 && day >= d.createdAt; i++) {
    if (isScheduledOn(d.days, day)) {
      occ.push({ date: day, done: doneSet.has(day), late: lateSet.has(day) });
    }
    day = addDays(day, -1);
  }
  const done = occ.filter((o) => o.done).length;
  const late = occ.filter((o) => o.done && o.late).length;
  const onTime = done - late;
  const recent = occ.slice(0, 7);
  const times = occ.filter((o) => o.done && !o.late).map((o) => d.times?.[o.date]).filter(Boolean) as string[];
  return {
    scheduled: occ.length,
    done,
    onTime,
    late,
    missed: occ.length - done,
    rate: occ.length > 0 ? onTime / occ.length : 0,
    avgDoneTime: avgHm(times),
    recentTrend: recent.length > 0 ? recent.filter((o) => o.done && !o.late).length / recent.length : 0,
  };
}

export function wakeStats(p: Profile): { avg: string | null; count: number; earliest: string | null } {
  const t = todayStr();
  const times: string[] = [];
  for (let i = 0; i < 14; i++) {
    const w = p.wakeLog[addDays(t, -i)];
    if (w) times.push(w);
  }
  return {
    avg: avgHm(times),
    count: times.length,
    earliest: times.length > 0 ? minToHm(Math.min(...times.map(hmToMin))) : null,
  };
}

export function stepsWeek(p: Profile): { today: number; week: number; avg: number } {
  const t = todayStr();
  let week = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(t, -i);
    week += (p.steps.counted[d] ?? 0) + (p.steps.manual[d] ?? 0);
  }
  return { today: (p.steps.counted[t] ?? 0) + (p.steps.manual[t] ?? 0), week, avg: Math.round(week / 7) };
}

function chronoFor(query: string, log: TimeLogEntry[]): { label: string; count: number; avgMin: number } | null {
  const qWords = norm(query).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const matches = log.filter((e) => {
    const l = norm(e.label);
    return qWords.some((w) => l.includes(w));
  });
  if (matches.length === 0) return null;
  return {
    label: matches[0].label,
    count: matches.length,
    avgMin: Math.round(matches.reduce((a, e) => a + e.seconds, 0) / matches.length / 60),
  };
}

const fmtList = (items: string[]) => items.map((i) => `• ${i}`).join('\n');
const pct = (x: number) => `${Math.round(x * 100)} %`;

// ═══════════════ suggestions & programmes ═══════════════

export function suggestTemplates(ctx: OracleContext, count = 4, rubriques?: string[]): TaskTemplate[] {
  const t = todayStr();
  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const existing = new Set([
    ...ctx.dailies.map((d) => norm(d.title)),
    ...ctx.quests.filter((q) => !q.completedAt).map((q) => norm(q.title)),
  ]);
  const pool: Array<{ tpl: TaskTemplate; rub: string }> = [];
  for (const r of LIBRARY) {
    if (rubriques && !rubriques.includes(r.id)) continue;
    for (const tpl of r.templates) {
      if (existing.has(norm(tpl.title))) continue;
      if (tpl.kind === 'quest' && !rubriques) continue;
      if (tpl.days && !isScheduledOn(tpl.days, t)) continue;
      if (tpl.kind === 'timed' && tpl.before && tpl.before <= nowStr) continue;
      pool.push({ tpl, rub: r.id });
    }
  }
  const seed = Number(t.replaceAll('-', ''));
  return pool
    .map((x, i) => ({ ...x, k: Math.sin(seed + i * 7.31) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, count)
    .map((x) => x.tpl);
}

export function tplRubriqueId(tpl: TaskTemplate): string | undefined {
  for (const r of LIBRARY) if (r.templates.includes(tpl)) return r.id;
  return undefined;
}

/** adjectifs de « journée à thème » → rubriques */
const THEME_WORDS: Array<[RegExp, string]> = [
  [/sportif|sportive|sport|athletique|muscle|cardio/, 'sport'],
  [/creatif|creative|créatif|créative|artistique|art/, 'creativite'],
  [/studieuse|studieux|etude|étude|revision|révision|apprentissage/, 'etudes'],
  [/productif|productive|travail|boulot|pro\b/, 'travail'],
  [/zen|calme|detente|détente|repos|meditation|méditation|bien-?etre|bien-?être/, 'esprit'],
  [/romantique|amour|amoureuse|couple|coeur|cœur/, 'amour'],
  [/menage|ménage|maison|rangement|propre/, 'maison'],
  [/hygiene|hygiène|soin/, 'hygiene'],
  [/social|famille|ami/, 'social'],
  [/cuisine|gourmande|nutrition|manger/, 'nutrition'],
  [/tech|code|geek|informatique|dev/, 'tech'],
  [/sommeil|dormir|repos/, 'sommeil'],
  [/finance|argent|budget/, 'finances'],
  [/spirituel|spirituelle|priere|prière|foi|âme|ame/, 'spiritualite'],
  [/animal|animaux|chien|chat/, 'animaux'],
  [/aventure|sortie|dehors|exploration|découverte|decouverte/, 'sorties'],
  [/admin|paperasse|papiers|démarche|demarche/, 'admin'],
];

function detectRubriques(s: string): string[] {
  const out: string[] = [];
  for (const [re, id] of THEME_WORDS) if (re.test(s) && !out.includes(id)) out.push(id);
  return out;
}

export function dailiesAtRisk(ctx: OracleContext): Daily[] {
  const t = todayStr();
  return ctx.dailies.filter((d) => isScheduledOn(d.days, t) && d.lastCompletedDate !== t);
}

// ═══════════════ FAQ : l'Oracle connaît son monde ═══════════════

const FAQ: Array<[RegExp, string]> = [
  [/combo/, 'Le combo compte les tâches accomplies le même jour : chaque tâche ajoute +5 % d’XP aux suivantes (jusqu’à +40 %). Il retombe à zéro chaque nuit — enchaîne pour maximiser tes gains.'],
  [/streak|série/, 'Deux streaks coexistent : le streak GLOBAL (jours consécutifs avec au moins une tâche) et le streak de chaque quotidienne (+2 % d’XP par jour, max +60 %). Manquer une quotidienne programmée brise son streak et coûte de l’XP. Battre un record donne +25 %.'],
  [/chronometr|ponctualit|à l'heure|a l'heure/, 'Les tâches chronométrées ont une heure limite : validées à temps, +25 % d’XP ; en retard, moitié de la récompense et streak brisé. Je tiens le registre exact de tes horaires — demande-moi tes chances.'],
  [/xp|experience|expérience|niveau|monter/, `La courbe demande environ 152 000 XP pour le niveau 100 — des mois d'assiduité. Chaque niveau coûte plus cher que le précédent (le 100ᵉ coûte ${xpForLevel(100).toLocaleString('fr-FR')} XP à lui seul). Les récompenses grimpent doucement avec ton niveau.`],
  [/\bor\b|gold|argent du jeu|pièces|pieces/, 'L’or se gagne à chaque tâche et via les succès. Il s’échange dans Récompenses contre thèmes, sigils, titres et effets. Les derniers articles du catalogue coûtent des fortunes — c’est voulu, ce sont des trophées de légende.'],
  [/sigil|embleme|emblème|avatar/, 'Les sigils sont tes emblèmes héraldiques, à acheter avec l’or dans Récompenses. Certains exigent aussi un niveau minimal.'],
  [/theme|thème|couleur/, 'Les thèmes changent toute la palette de l’application. Ils s’achètent dans Récompenses ; certains sont réservés aux hauts niveaux.'],
  [/titre/, 'Les titres s’affichent à côté de ton nom (« l’Implacable », « Seigneur du Temps »…). Achète-les dans Récompenses, porte celui qui te ressemble.'],
  [/effet|particule|animation/, 'Deux familles d’effets : les fonds ambiants (permanents) et les effets de complétion (à chaque tâche). Certains se débloquent par niveau, d’autres s’achètent.'],
  [/succes|succès|achievement|trophee|trophée/, 'Il y a plus de 80 succès, chacun rapportant de l’or. Demande-moi « que me manque-t-il ? » et je te dirai les plus proches.'],
  [/alarme|reveil|réveil|berceuse/, 'Le module Outils → Alarmes gère ton réveil et ta berceuse du soir : mélodies de la galerie ou ton propre fichier audio. Quand tu arrêtes le réveil, je note l’heure — c’est ainsi que je connais tes matins.'],
  [/\bpas\b|podometre|podomètre|marche/, 'Le module Outils → Pas compte tes pas quand l’application est ouverte (capteur de mouvement) et te laisse ajouter le reste à la main. Objectif réglable, records et succès à la clé.'],
  [/chrono(?!metr)|minuteur|timer/, 'Le module Outils → Chrono mesure tes sessions (s’apprêter, se doucher, coder…). Une session d’au moins 10 minutes rapporte de l’XP, et j’utilise tes moyennes pour mes prédictions.'],
  [/sync|synchro|qr/, 'Réglages → Synchronisation : ton PC héberge une session (QR + code), ton téléphone tire ou pousse la sauvegarde. Même Wi-Fi requis, aucune donnée ne sort de chez toi.'],
  [/oracle|qui es-tu|tu es qui|t'es qui/, 'Je suis l’Oracle de Lennyx. Je vis dans ton appareil, je ne parle à personne d’autre qu’à toi, et je lis dans tes statistiques comme dans un grimoire. Demande-moi une prédiction, un bilan, un programme ou un défi.'],
];

// ═══════════════ le répondeur ═══════════════

const HELP = `Voici l'étendue de mes pouvoirs :
• Prédictions honnêtes — « ai-je une chance d'arriver au travail avant 8h ? »
• Programmes sur mesure — « je veux une journée sportive et créative »
• Statistiques — « à quelle heure je me réveille ? », « mes pas cette semaine ? », « mon temps moyen pour me préparer ? »
• Création en langage naturel — « ajoute une quête réviser, difficile », « quotidienne dormir avant 23h »
• « bilan » — ton rapport de la semaine · « que me reste-t-il ? » — tes tâches du jour
• « que me manque-t-il ? » — tes prochains succès · « défie-moi » — un défi surprise
• Et toute question sur le fonctionnement du jeu (combos, streaks, or, sigils…)`;

const MOTIVATION = [
  'La discipline pèse des grammes, le regret pèse des tonnes. Une tâche à la fois.',
  'Tu n’as pas besoin d’être motivé. Tu as besoin de commencer. La motivation suivra.',
  'Un streak ne se construit pas en un jour. Il se détruit en un seul. Protège le tien.',
  'Le niveau 100 n’est pas une destination, c’est la somme de tes matins.',
  'Fais-le mal s’il le faut, mais fais-le. La perfection est une récompense, pas un prérequis.',
  'Chaque case cochée est un vote pour la personne que tu veux devenir.',
];

const DAY_WORDS: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};

function parseDifficulty(s: string): Difficulty {
  if (/(épique|epique|extrême|extreme)/.test(s)) return 'epic';
  if (/(difficile|dur|hard)/.test(s)) return 'hard';
  if (/(facile|simple|easy)/.test(s)) return 'easy';
  return 'normal';
}

function parseDays(s: string): number[] {
  const days: number[] = [];
  for (const [w, n] of Object.entries(DAY_WORDS)) {
    if (new RegExp(`\\b${w}s?\\b`, 'i').test(s) && !days.includes(n)) days.push(n);
  }
  if (/week-?end/i.test(s)) for (const n of [6, 0]) if (!days.includes(n)) days.push(n);
  return days;
}

function parseTime(s: string): string | undefined {
  const m = s.match(/avant\s+(\d{1,2})\s*[h:]\s*(\d{2})?/i);
  if (!m) return undefined;
  const h = Math.min(23, parseInt(m[1], 10));
  const min = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function extractTitle(s: string): string {
  let t = s
    .replace(/^(oracle[,\s]*)?/i, '')
    .replace(/(ajoute|crée|cree|créer|creer|nouvelle?|ajouter)\s+(une?\s+)?(quête|quete|quotidienne|tâche|tache|routine|événement|evenement)?\s*:?\s*/i, '')
    .replace(/\b(épique|epique|difficile|facile|simple|normal)\b/gi, '')
    .replace(/\bavant\s+\d{1,2}\s*[h:]\s*\d{0,2}\b/gi, '')
    .replace(/\b(tous les jours|chaque jour|le|les)\s*(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi|week-?end)s?\b/gi, '')
    .replace(/\b(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi)s?\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, '')
    .trim();
  if (t.length > 0) t = t[0].toUpperCase() + t.slice(1);
  return t;
}

export function weeklyReport(ctx: OracleContext): string {
  const t = todayStr();
  let total = 0;
  let best = { d: t, xp: 0 };
  for (let i = 0; i < 7; i++) {
    const d = addDays(t, -i);
    const xp = ctx.profile.history[d] ?? 0;
    total += xp;
    if (xp > best.xp) best = { d, xp };
  }
  const info = levelFromXp(ctx.profile.xp);
  const risk = dailiesAtRisk(ctx);
  const wk = wakeStats(ctx.profile);
  const st = stepsWeek(ctx.profile);
  return (
    `Bilan des 7 derniers jours :\n` +
    `• ${total} XP gagnés (meilleure journée : ${best.d}, +${best.xp} XP)\n` +
    `• Niveau ${info.level} — ${info.rank.name}, encore ${info.xpNeeded - info.xpInLevel} XP avant le niveau ${Math.min(info.level + 1, 100)}\n` +
    `• Streak global : ${ctx.profile.currentStreak} jour(s) (record ${ctx.profile.maxStreak}) · Or : ${ctx.profile.gold}\n` +
    (wk.avg ? `• Réveil moyen : ${wk.avg} (${wk.count} matin(s) enregistrés)\n` : '') +
    (st.week > 0 ? `• Pas : ${st.today.toLocaleString('fr-FR')} aujourd'hui, ${st.week.toLocaleString('fr-FR')} sur 7 jours\n` : '') +
    (risk.length > 0
      ? `\n⚠ ${risk.length} quotidienne(s) encore en attente aujourd'hui :\n${fmtList(risk.map((d) => d.title))}`
      : `\nToutes tes quotidiennes du jour sont faites. Impeccable.`)
  );
}

export function briefing(ctx: OracleContext): string {
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const risk = dailiesAtRisk(ctx);
  const sugg = suggestTemplates(ctx, 3);
  let txt = `${hello}, ${ctx.profile.name}. `;
  if (ctx.profile.currentStreak > 0) txt += `Ton streak est à ${ctx.profile.currentStreak} jour(s) — ne le laisse pas s'éteindre. `;
  if (risk.length > 0) {
    txt += `\n\nAu programme aujourd'hui :\n${fmtList(risk.map((d) => d.title + (d.timeLimit ? ` (avant ${d.timeLimit})` : '')))}`;
  } else if (ctx.dailies.length > 0) {
    txt += `\n\nToutes tes quotidiennes du jour sont déjà faites.`;
  }
  if (sugg.length > 0) {
    txt += `\n\nSi tu veux aller plus loin :\n${fmtList(sugg.map((s) => s.title))}\n\nDis « génère ma journée » et je m'en occupe.`;
  }
  return txt;
}

/** Prédiction honnête sur une tâche chronométrée. */
function predict(query: string, ctx: OracleContext): string {
  const d = findDaily(query, ctx.dailies);
  if (!d) {
    return `Je ne trouve pas de quotidienne correspondant à ta question. Nomme-la comme dans ton journal — par exemple : « ai-je une chance pour “${ctx.dailies[0]?.title ?? 'Arriver au travail avant 8h00'}” ? »`;
  }
  const st = punctuality(d);
  if (st.scheduled < 3) {
    return `Honnêtement ? Je manque de recul : « ${d.title} » n'a que ${st.scheduled} occurrence(s) enregistrée(s). Reviens me voir dans quelques jours et je te donnerai un vrai verdict chiffré.`;
  }
  const wk = wakeStats(ctx.profile);
  const chrono = chronoFor('préparer apprêter douche', ctx.timeLog);
  let verdict: string;
  if (st.recentTrend >= 0.8) verdict = 'Oui, et sans trembler';
  else if (st.recentTrend >= 0.6) verdict = 'Oui, si tu ne traînes pas';
  else if (st.recentTrend >= 0.4) verdict = 'C’est jouable, mais fragile';
  else verdict = 'Au rythme actuel, non — et tu le sais';
  let txt =
    `Verdict : ${verdict}.\n\n` +
    `Les faits, sur tes ${st.scheduled} dernières occurrences de « ${d.title} » :\n` +
    `• Réussies à l'heure : ${st.onTime} (${pct(st.rate)})` +
    (st.late > 0 ? ` · en retard : ${st.late}` : '') +
    (st.missed > 0 ? ` · manquées : ${st.missed}` : '') + '\n' +
    `• Tendance sur 7 occurrences : ${pct(st.recentTrend)}\n` +
    (st.avgDoneTime ? `• Heure moyenne de validation : ${st.avgDoneTime}${d.timeLimit ? ` (limite ${d.timeLimit})` : ''}\n` : '');
  if (wk.avg) txt += `• Ton réveil moyen : ${wk.avg}\n`;
  if (chrono) txt += `• Temps moyen chronométré pour te préparer : ${chrono.avgMin} min (${chrono.count} session(s))\n`;
  if (d.timeLimit && st.avgDoneTime) {
    const margin = hmToMin(d.timeLimit) - hmToMin(st.avgDoneTime);
    txt += margin >= 0
      ? `\nTu valides en moyenne ${margin} min avant la limite. Garde cette marge.`
      : `\nTu dépasses la limite de ${-margin} min en moyenne. ${wk.avg ? `Avance ton réveil d'autant et l'affaire est réglée.` : `Avance ton départ d'autant et l'affaire est réglée.`}`;
  }
  return txt;
}

function nextAchievements(ctx: OracleContext): string {
  const p = ctx.profile;
  const level = levelFromXp(p.xp).level;
  const locked = ACHIEVEMENTS.filter((a) => !p.unlocked[a.id]);
  if (locked.length === 0) return 'Tu as TOUT débloqué. Je m’incline.';
  const hints = locked.slice(0, 30).map((a) => ({ a, done: a.check(p, level) ? 1 : 0 }));
  const picks = hints.slice(0, 5);
  return `Succès verrouillés : ${locked.length}. Les prochains à ta portée :\n${fmtList(
    picks.map(({ a }) => `${a.name} — ${a.desc} (+${a.gold} or)`),
  )}`;
}

// ═══════════════ dossier pour l'Oracle en ligne (LLM) ═══════════════

/** Résumé texte de toutes les données utiles, injecté comme contexte au LLM. */
export function buildDossier(ctx: OracleContext): string {
  const p = ctx.profile;
  const info = levelFromXp(p.xp);
  const t = todayStr();
  const lines: string[] = [];
  lines.push(`Nom : ${p.name} · Niveau ${info.level} (${info.rank.name}) · ${p.xp} XP total · ${p.gold} or`);
  lines.push(`Streak global : ${p.currentStreak} jour(s), record ${p.maxStreak} · Combo du jour : ×${p.combo}`);

  const risk = dailiesAtRisk(ctx);
  if (ctx.dailies.length > 0) {
    lines.push(`Quotidiennes du jour : ${ctx.dailies.length - risk.length}/${ctx.dailies.filter((d) => isScheduledOn(d.days, t)).length} faites.`);
    const worst = [...ctx.dailies]
      .map((d) => ({ d, st: punctuality(d) }))
      .filter((x) => x.st.scheduled >= 3)
      .sort((a, b) => a.st.rate - b.st.rate)
      .slice(0, 3);
    for (const { d, st } of worst) {
      lines.push(`- « ${d.title} »${d.timeLimit ? ` (avant ${d.timeLimit})` : ''} : réussie ${pct(st.rate)} du temps, tendance récente ${pct(st.recentTrend)}${st.avgDoneTime ? `, validée en moyenne à ${st.avgDoneTime}` : ''}.`);
    }
  }
  const activeQuests = ctx.quests.filter((q) => !q.completedAt);
  if (activeQuests.length > 0) lines.push(`Quêtes en cours : ${activeQuests.map((q) => q.title).slice(0, 5).join(', ')}.`);

  const wk = wakeStats(p);
  if (wk.avg) lines.push(`Réveil moyen (14 j) : ${wk.avg}, au plus tôt ${wk.earliest}.`);
  const st = stepsWeek(p);
  if (st.week > 0) lines.push(`Pas : ${st.today} aujourd'hui (objectif ${p.steps.goal}), moyenne 7 j : ${st.avg}, record ${p.steps.bestDay}.`);
  if (ctx.timeLog.length > 0) {
    const recentChrono = ctx.timeLog.slice(0, 5).map((e) => `${e.label} (${Math.round(e.seconds / 60)} min)`);
    lines.push(`Sessions chronométrées récentes : ${recentChrono.join(', ')}.`);
  }

  // finances du mois en cours
  const month = t.slice(0, 7);
  const txMonth = ctx.transactions.filter((x) => x.date.startsWith(month));
  if (txMonth.length > 0) {
    const income = txMonth.filter((x) => x.type === 'income').reduce((a, x) => a + x.amount, 0);
    const expense = txMonth.filter((x) => x.type === 'expense').reduce((a, x) => a + x.amount, 0);
    lines.push(`Finances du mois : revenus ${income.toFixed(0)}, dépenses ${expense.toFixed(0)}, reste à vivre ${(income - expense).toFixed(0)}.`);
  }
  const accomplishments = ctx.notes.filter((n) => n.kind === 'accomplishment').slice(0, 3).map((n) => n.text);
  if (accomplishments.length > 0) lines.push(`Dernières victoires notées : ${accomplishments.join(' ; ')}.`);
  const lastNotes = ctx.notes.filter((n) => n.kind === 'note').slice(0, 3).map((n) => n.text.slice(0, 80));
  if (lastNotes.length > 0) lines.push(`Dernières notes libres : ${lastNotes.join(' ; ')}.`);

  const unlockedCount = Object.keys(p.unlocked).length;
  lines.push(`Succès débloqués : ${unlockedCount}/${ACHIEVEMENTS.length}.`);
  return lines.join('\n');
}

export function answer(input: string, ctx: OracleContext): OracleReply {
  const s = norm(input);

  if (/^(aide|help|\?|que sais-tu|commandes?|pouvoirs)/.test(s)) return { text: HELP };

  // ── prédictions honnêtes ──
  if (/(chance|probabilite|penses-tu|crois-tu|possible|capable|vais-je|arriverai|reussirai|y arriver)/.test(s)) {
    return { text: predict(input, ctx) };
  }

  // ── programme à thème ──
  const wantsProgram = /(programme|journee|planifie|genere|remplis|organise)/.test(s);
  const rubs = detectRubriques(s);
  if (wantsProgram && rubs.length > 0) {
    const names = rubs.map((r) => LIBRARY.find((x) => x.id === r)?.name ?? r).join(' + ');
    const sugg = suggestTemplates(ctx, Math.min(6, 2 + rubs.length * 2), rubs);
    if (sugg.length === 0)
      return { text: `Ta journée ${names} est déjà couverte — tout ce que je pourrais proposer existe déjà dans ton journal.` };
    return {
      text: `Journée ${names} — voici ce que je t'ai composé :\n${fmtList(
        sugg.map((t) => t.title + (t.before ? ` (avant ${t.before})` : '')),
      )}\n\nC'est ajouté. La magie n'attend que ta discipline.`,
      actions: [{ kind: 'generate-day', payload: { rubriques: rubs } }],
    };
  }
  if (wantsProgram && /(journee|jour)/.test(s)) {
    const sugg = suggestTemplates(ctx, 4);
    if (sugg.length === 0)
      return { text: 'Ta journée est déjà bien remplie — je n’ai rien trouvé de pertinent à ajouter.' };
    return {
      text: `Voici ce que je te propose pour aujourd'hui :\n${fmtList(
        sugg.map((t) => t.title + (t.before ? ` (avant ${t.before})` : '')),
      )}\n\nC'est ajouté. Montre-moi de quoi tu es capable.`,
      actions: [{ kind: 'generate-day' }],
    };
  }

  // ── statistiques ciblées ──
  if (/(reveil|leve|me leve|debout)/.test(s) && /(heure|moyen|quand|stats?)/.test(s)) {
    const wk = wakeStats(ctx.profile);
    if (!wk.avg)
      return { text: 'Je n’ai encore aucun réveil enregistré. Active le réveil dans Outils → Alarmes : chaque fois que tu l’arrêtes, je note l’heure.' };
    return { text: `Sur tes ${wk.count} derniers matins : réveil moyen à ${wk.avg}, au plus tôt ${wk.earliest}. ${hmToMin(wk.avg) <= 7 * 60 ? 'Respect.' : 'Il y a de la marge pour conquérir l’aube.'}` };
  }
  if (/\bpas\b|podometre|marche/.test(s) && /(combien|stats?|aujourd|semaine|total)/.test(s)) {
    const st = stepsWeek(ctx.profile);
    return {
      text: `Pas : ${st.today.toLocaleString('fr-FR')} aujourd'hui (objectif ${ctx.profile.steps.goal.toLocaleString('fr-FR')}), ${st.week.toLocaleString('fr-FR')} sur 7 jours (moyenne ${st.avg.toLocaleString('fr-FR')}/jour). Record : ${ctx.profile.steps.bestDay.toLocaleString('fr-FR')}. Total de carrière : ${ctx.profile.counters.totalSteps.toLocaleString('fr-FR')}.`,
    };
  }
  if (/(temps|combien de temps|duree|durée)/.test(s) && /(moyen|mets|prends|passe)/.test(s)) {
    const c = chronoFor(input, ctx.timeLog);
    if (!c)
      return { text: 'Aucune session chronométrée ne correspond. Utilise Outils → Chrono en nommant tes sessions (« se préparer », « douche »…) et je saurai tout te dire.' };
    return { text: `« ${c.label} » : ${c.avgMin} min en moyenne sur ${c.count} session(s). ${c.avgMin > 30 ? 'On peut serrer ça.' : 'Belle efficacité.'}` };
  }
  if (/(manque|prochain succes|prochains succes|debloquer)/.test(s)) {
    return { text: nextAchievements(ctx) };
  }

  if (/(reste a vivre|budget|finance|depense|depenses|revenu)/.test(s)) {
    const month = todayStr().slice(0, 7);
    const txMonth = ctx.transactions.filter((x) => x.date.startsWith(month));
    if (txMonth.length === 0)
      return { text: 'Rien enregistré ce mois-ci. Le module Notes → Finances t’attend pour suivre revenus et dépenses.' };
    const income = txMonth.filter((x) => x.type === 'income').reduce((a, x) => a + x.amount, 0);
    const expense = txMonth.filter((x) => x.type === 'expense').reduce((a, x) => a + x.amount, 0);
    return { text: `Ce mois-ci : ${income.toFixed(0)} de revenus, ${expense.toFixed(0)} de dépenses. Reste à vivre : ${(income - expense).toFixed(0)}.` };
  }

  if (/(bilan|rapport|resume|statistiques|stats)/.test(s)) return { text: weeklyReport(ctx) };

  if (/(reste|en attente|a faire|programme du jour)/.test(s)) {
    const risk = dailiesAtRisk(ctx);
    return {
      text:
        risk.length === 0
          ? 'Rien en attente : toutes tes quotidiennes du jour sont faites.'
          : `Il te reste ${risk.length} quotidienne(s) aujourd'hui :\n${fmtList(
              risk.map((d) => d.title + (d.timeLimit ? ` (avant ${d.timeLimit})` : '')),
            )}`,
    };
  }

  // ── défi ──
  if (/(defie|defi|challenge|surprends)/.test(s)) {
    const pool = LIBRARY.flatMap((r) => r.templates.filter((t) => t.kind === 'quest' && (t.difficulty === 'hard' || t.difficulty === 'epic')));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return {
      text: `Défi accepté ? « ${pick.title} » — en événement spécial, récompense doublée. Prouve-moi que je ne parle pas dans le vide.`,
      actions: [{ kind: 'add-quest', payload: { title: pick.title, difficulty: pick.difficulty, isEvent: true } }],
    };
  }

  if (/(conseil|suggere|propose|idee)/.test(s)) {
    const sugg = suggestTemplates(ctx, 3);
    if (sugg.length === 0)
      return { text: 'Tu as déjà tout couvert pour aujourd’hui. La récupération fait partie de l’entraînement.' };
    // l'Oracle agit : il ajoute réellement ce qu'il conseille
    return {
      text: `Vu l'heure et ton profil, je t'ai ajouté :\n${fmtList(sugg.map((t) => t.title))}`,
      actions: [{ kind: 'generate-day', payload: { count: 3 } }],
    };
  }

  if (/(motive|motivation|encourage|fatigue|envie de rien)/.test(s)) {
    return { text: MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)] };
  }

  // ── création de tâches ──
  if (/(quotidienne|routine|chaque jour|tous les jours)/.test(s) && /(ajoute|cree|nouvelle|creer)/.test(s)) {
    const title = extractTitle(input);
    if (!title) return { text: 'Donne-moi un titre — « crée une quotidienne lire 20 pages ».' };
    const timeLimit = parseTime(s);
    return {
      text: `C'est noté. Quotidienne « ${title} » créée${timeLimit ? ` — à valider avant ${timeLimit}` : ''}.`,
      actions: [{ kind: 'add-daily', payload: { title, difficulty: parseDifficulty(s), days: parseDays(s), timeLimit } }],
    };
  }
  if (/(ajoute|cree|nouvelle|creer)/.test(s)) {
    const title = extractTitle(input);
    if (!title) return { text: 'Donne-moi un titre — « ajoute une quête ranger le garage, difficile ».' };
    const timeLimit = parseTime(s);
    if (timeLimit) {
      return {
        text: `Quotidienne « ${title} » créée — à valider avant ${timeLimit}.`,
        actions: [{ kind: 'add-daily', payload: { title, difficulty: parseDifficulty(s), days: parseDays(s), timeLimit } }],
      };
    }
    const isEvent = /(evenement|important|special)/.test(s);
    return {
      text: `Quête « ${title} » forgée${isEvent ? ' — en événement spécial, récompense doublée' : ''}.`,
      actions: [{ kind: 'add-quest', payload: { title, difficulty: parseDifficulty(s), isEvent } }],
    };
  }

  // ── FAQ sur le jeu ──
  for (const [re, txt] of FAQ) {
    if (re.test(s)) return { text: txt };
  }

  if (/(bonjour|salut|hello|bonsoir|coucou|cc\b|yo\b)/.test(s)) return { text: briefing(ctx) };
  if (/(merci|thanks)/.test(s)) return { text: 'C’est un honneur de servir. Retourne conquérir ta journée.' };

  return {
    text: `Je n'ai pas saisi. Essaie « aide » — ou pose-moi une vraie question : « ai-je une chance d'être à l'heure demain ? », « journée sportive et créative », « mes stats de pas »…`,
  };
}
