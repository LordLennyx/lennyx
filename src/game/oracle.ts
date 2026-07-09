// ── L'Oracle : agent intégré de Lennyx (100 % hors-ligne, zéro serveur) ────
// Comprend des requêtes en français : création de tâches en langage naturel,
// bilan, suggestions contextuelles, planification de journée.

import type { Daily, Profile, Quest } from './types';
import type { Difficulty } from './engine';
import { isScheduledOn, todayStr, addDays } from './engine';
import { LIBRARY, type TaskTemplate } from './library';
import { levelFromXp } from './xp';

export interface OracleContext {
  profile: Profile;
  quests: Quest[];
  dailies: Daily[];
}

export interface OracleAction {
  kind: 'add-quest' | 'add-daily' | 'generate-day';
  payload?: {
    title: string;
    difficulty: Difficulty;
    days?: number[];
    timeLimit?: string;
    isEvent?: boolean;
  };
}

export interface OracleReply {
  text: string;
  actions?: OracleAction[];
}

const DAY_WORDS: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
  dim: 0, lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6,
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
    if (new RegExp(`\\b${w}\\b`, 'i').test(s) && !days.includes(n)) days.push(n);
  }
  if (/week-?end/i.test(s)) for (const n of [6, 0]) if (!days.includes(n)) days.push(n);
  if (/\bsemaine\b/i.test(s) && days.length === 0) days.push(1, 2, 3, 4, 5);
  return days;
}

function parseTime(s: string): string | undefined {
  const m = s.match(/avant\s+(\d{1,2})\s*[h:]\s*(\d{2})?/i);
  if (!m) return undefined;
  const h = Math.min(23, parseInt(m[1], 10));
  const min = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Extrait le titre : ce qui suit le verbe de création, nettoyé des mots-clés. */
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

/** Modèles pertinents maintenant : jour programmé + fenêtre horaire encore ouverte. */
export function suggestTemplates(ctx: OracleContext, count = 4): TaskTemplate[] {
  const t = todayStr();
  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const existing = new Set([
    ...ctx.dailies.map((d) => d.title.toLowerCase()),
    ...ctx.quests.filter((q) => !q.completedAt).map((q) => q.title.toLowerCase()),
  ]);
  const pool: TaskTemplate[] = [];
  for (const r of LIBRARY) {
    for (const tpl of r.templates) {
      if (existing.has(tpl.title.toLowerCase())) continue;
      if (tpl.kind === 'quest') continue;
      if (tpl.days && !isScheduledOn(tpl.days, t)) continue;
      if (tpl.kind === 'timed' && tpl.before && tpl.before <= nowStr) continue;
      pool.push(tpl);
    }
  }
  // mélange déterministe par jour (pour que la suggestion soit stable dans la journée)
  const seed = Number(t.replaceAll('-', ''));
  return pool
    .map((tpl, i) => ({ tpl, k: Math.sin(seed + i * 7.31) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, count)
    .map((x) => x.tpl);
}

export function dailiesAtRisk(ctx: OracleContext): Daily[] {
  const t = todayStr();
  return ctx.dailies.filter((d) => isScheduledOn(d.days, t) && d.lastCompletedDate !== t);
}

function fmtList(items: string[]): string {
  return items.map((i) => `• ${i}`).join('\n');
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
  return (
    `Bilan des 7 derniers jours :\n` +
    `• ${total} XP gagnés (meilleure journée : ${best.d}, +${best.xp} XP)\n` +
    `• Niveau ${info.level} — ${info.rank.name}, encore ${info.xpNeeded - info.xpInLevel} XP avant le niveau ${Math.min(info.level + 1, 100)}\n` +
    `• Streak global : ${ctx.profile.currentStreak} jour(s) (record : ${ctx.profile.maxStreak})\n` +
    `• Or : ${ctx.profile.gold} pièces\n` +
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
    txt += `\n\nSi tu veux aller plus loin, la bibliothèque propose :\n${fmtList(sugg.map((s) => s.title))}\n\nDis « génère ma journée » et je les ajoute pour toi.`;
  }
  return txt;
}

const HELP = `Je suis l'Oracle de Lennyx. Voici ce que je sais faire :
• « ajoute une quête réviser le chapitre 3, difficile » — créer une quête
• « crée une quotidienne sport lundi mercredi vendredi » — créer une routine
• « quotidienne se coucher avant 23h » — routine chronométrée
• « génère ma journée » — je remplis ta journée depuis la bibliothèque
• « bilan » ou « rapport » — ton résumé de la semaine
• « que me reste-t-il ? » — tes quotidiennes en attente
• « conseil » — une suggestion adaptée à l'heure qu'il est`;

const MOTIVATION = [
  'La discipline pèse des grammes, le regret pèse des tonnes. Une tâche à la fois.',
  'Tu n’as pas besoin d’être motivé. Tu as besoin de commencer. La motivation suivra.',
  'Un streak ne se construit pas en un jour. Il se détruit en un seul. Protège le tien.',
  'Le niveau 100 n’est pas une destination, c’est la somme de tes matins.',
  'Fais-le mal s’il le faut, mais fais-le. La perfection est une récompense, pas un prérequis.',
  'Chaque case cochée est un vote pour la personne que tu veux devenir.',
];

export function answer(input: string, ctx: OracleContext): OracleReply {
  const s = input.toLowerCase().trim();

  if (/^(aide|help|\?|que sais-tu|commandes?)/.test(s)) return { text: HELP };

  if (/(génère|genere|planifie|remplis).*(journée|journee|jour)/.test(s)) {
    const sugg = suggestTemplates(ctx, 4);
    if (sugg.length === 0)
      return { text: 'Ta journée est déjà bien remplie — je n’ai rien trouvé de pertinent à ajouter. Reviens demain.' };
    return {
      text: `Voici ce que je te propose pour aujourd'hui :\n${fmtList(
        sugg.map((t) => t.title + (t.before ? ` (avant ${t.before})` : '')),
      )}\n\nC'est ajouté. Montre-moi de quoi tu es capable.`,
      actions: [{ kind: 'generate-day' }],
    };
  }

  if (/(bilan|rapport|résumé|resume|statistiques|stats)/.test(s)) return { text: weeklyReport(ctx) };

  if (/(reste|en attente|à faire|a faire|programme)/.test(s)) {
    const risk = dailiesAtRisk(ctx);
    return {
      text:
        risk.length === 0
          ? 'Rien en attente : toutes tes quotidiennes du jour sont faites. Tu peux piocher dans la bibliothèque si tu en veux plus.'
          : `Il te reste ${risk.length} quotidienne(s) aujourd'hui :\n${fmtList(
              risk.map((d) => d.title + (d.timeLimit ? ` (avant ${d.timeLimit})` : '')),
            )}`,
    };
  }

  if (/(conseil|suggère|suggere|propose|idée|idee)/.test(s)) {
    const sugg = suggestTemplates(ctx, 3);
    return {
      text:
        sugg.length === 0
          ? 'Tu as déjà tout couvert pour aujourd’hui. Repose-toi — la récupération fait partie de l’entraînement.'
          : `Vu l'heure et ton profil, je te suggère :\n${fmtList(sugg.map((t) => t.title))}\n\nVa dans la Bibliothèque pour les ajouter en un clic, ou dis « génère ma journée ».`,
    };
  }

  if (/(motive|motivation|encourage|fatigué|fatigue|envie de rien)/.test(s)) {
    return { text: MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)] };
  }

  // création de quotidienne
  if (/(quotidienne|routine|chaque jour|tous les jours)/.test(s) && /(ajoute|crée|cree|nouvelle|créer|creer)/.test(s)) {
    const title = extractTitle(input);
    if (!title) return { text: 'Donne-moi un titre — par exemple : « crée une quotidienne lire 20 pages ».' };
    const timeLimit = parseTime(s);
    return {
      text: `C'est noté. Quotidienne « ${title} » créée${timeLimit ? ` — à valider avant ${timeLimit}` : ''}.`,
      actions: [{ kind: 'add-daily', payload: { title, difficulty: parseDifficulty(s), days: parseDays(s), timeLimit } }],
    };
  }

  // création de quête
  if (/(ajoute|crée|cree|nouvelle|créer|creer)/.test(s)) {
    const title = extractTitle(input);
    if (!title) return { text: 'Donne-moi un titre — par exemple : « ajoute une quête ranger le garage, difficile ».' };
    const timeLimit = parseTime(s);
    if (timeLimit || /(quotidienne|routine)/.test(s)) {
      return {
        text: `Quotidienne « ${title} » créée${timeLimit ? ` — à valider avant ${timeLimit}` : ''}.`,
        actions: [{ kind: 'add-daily', payload: { title, difficulty: parseDifficulty(s), days: parseDays(s), timeLimit } }],
      };
    }
    const isEvent = /(événement|evenement|important|spécial|special)/.test(s);
    return {
      text: `Quête « ${title} » forgée${isEvent ? ' — en événement spécial, récompense doublée' : ''}. Elle t'attend.`,
      actions: [{ kind: 'add-quest', payload: { title, difficulty: parseDifficulty(s), isEvent } }],
    };
  }

  if (/(bonjour|salut|hello|yo|bonsoir|cc|coucou)/.test(s)) {
    return { text: briefing(ctx) };
  }

  if (/(merci|thanks)/.test(s)) {
    return { text: 'C’est un honneur de servir. Retourne conquérir ta journée.' };
  }

  return {
    text: `Je n'ai pas saisi ta requête. Essaie « aide » pour voir ce que je sais faire — ou parle-moi simplement : « bilan », « conseil », « génère ma journée », « ajoute une quête… ».`,
  };
}
