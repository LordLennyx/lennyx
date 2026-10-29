// ── L'humeur de Lennyx ────────────────────────────────────────────────────
// Le moteur qui donne un VISAGE à l'application : l'icône Android, le widget,
// le blason de l'accueil et la couleur du cadre changent selon la satisfaction
// de Lennyx vis-à-vis de la journée de son porteur. C'est le ressort de
// Duolingo — l'application a une opinion, et elle la montre.
//
// Logique PURE et injectable (`today`, `nowMinutes`) : testable sans React, sans
// store, sans téléphone. Toute la mise en scène (icônes, drawables, phrases)
// se dérive de l'identifiant d'humeur renvoyé ici.
//
// ⚠️ Règle de conception à ne pas perdre : l'humeur est INDULGENTE LE MATIN.
// Juger 0 quotidienne sur 5 à 7 h du matin comme un échec serait injuste et
// rendrait l'icône déprimante en permanence. On compare donc l'avancement réel
// à l'avancement ATTENDU à cette heure-là de la journée.

import type { Daily, Profile, Quest } from './types';
import { DIFFICULTY_ORDER, addDays, isScheduledOn, nowTimeStr, todayStr, type Difficulty } from './engine';
import { stepsOn } from './steps';

export type MoodId = 'glorieux' | 'fier' | 'serein' | 'vigilant' | 'inquiet' | 'eteint';

export interface MoodDef {
  id: MoodId;
  label: string;
  /** Score minimal pour atteindre cette humeur. */
  min: number;
  /** Couleur de l'anneau héraldique (icône, widget, blason). */
  ring: string;
  /** Teinte d'accompagnement (halo, barre de progression). */
  accent: string;
  /** Ce que Lennyx a à dire. Une phrase par jour, pas par rendu. */
  lines: string[];
}

/**
 * Six humeurs, de la gloire à l'extinction. L'ordre est décroissant : la
 * première dont le seuil est atteint gagne.
 *
 * ⚠️ Les identifiants servent de NOMS DE RESSOURCES Android
 * (`ic_launcher_glorieux`, `widget_frame_fier`…) : ils doivent rester en
 * minuscules, sans accent ni tiret. Ne pas les renommer à la légère.
 */
export const MOODS: MoodDef[] = [
  {
    id: 'glorieux',
    label: 'Glorieux',
    min: 86,
    ring: '#f4dd8c',
    accent: '#ffd76a',
    lines: [
      'Journée de légende. Lennyx s’incline.',
      'Rien ne te résiste aujourd’hui.',
      'Voilà ce qu’on appelle régner sur sa journée.',
      'Ton nom mérite d’être gravé dans la pierre.',
    ],
  },
  {
    id: 'fier',
    label: 'Fier',
    min: 70,
    ring: '#d4af37',
    accent: '#e8c558',
    lines: [
      'Belle tenue. Garde ce cap.',
      'Lennyx est fier de toi.',
      'Tu avances comme il faut — sans bruit, sans faute.',
      'La discipline te va bien.',
    ],
  },
  {
    id: 'serein',
    label: 'Serein',
    min: 54,
    ring: '#9aa7b4',
    accent: '#7fd1ae',
    lines: [
      'Tout est en ordre. Continue.',
      'Rythme régulier, rien à signaler.',
      'La journée suit son cours.',
      'Ni gloire ni faute — le travail avance.',
    ],
  },
  {
    id: 'vigilant',
    label: 'Vigilant',
    min: 38,
    ring: '#e8964a',
    accent: '#e8964a',
    lines: [
      'Lennyx t’observe. Il reste du travail.',
      'La journée peut encore basculer du bon côté.',
      'Quelques quêtes attendent encore ton épée.',
      'Rien n’est perdu, mais rien n’est gagné.',
    ],
  },
  {
    id: 'inquiet',
    label: 'Inquiet',
    min: 20,
    ring: '#c76b4a',
    accent: '#d2694f',
    lines: [
      'Lennyx s’inquiète. Reprends la main.',
      'Les retards s’accumulent — une seule tâche suffit à inverser le vent.',
      'Ta légende hésite. Donne-lui une raison d’y croire.',
      'Il est encore temps, mais plus pour longtemps.',
    ],
  },
  {
    id: 'eteint',
    label: 'Éteint',
    min: 0,
    ring: '#5a5a62',
    accent: '#8f8a80',
    lines: [
      'Les braises sont froides. Une tâche, une seule, et tout repart.',
      'Lennyx attend ton retour dans le silence.',
      'Le royaume dort. Réveille-le.',
      'Rien n’est accompli — et c’est précisément là que tout commence.',
    ],
  },
];

export function moodDef(id: MoodId): MoodDef {
  return MOODS.find((m) => m.id === id) ?? MOODS[2];
}

export interface MoodContext {
  profile: Profile;
  quests: Quest[];
  dailies: Daily[];
}

export interface MoodState {
  id: MoodId;
  label: string;
  /** 0..100 — satisfaction de Lennyx. */
  score: number;
  /** La phrase du jour, stable d'un rendu à l'autre. */
  line: string;
  doneToday: number;
  totalToday: number;
  /** Chronométrées dépassées + quêtes hors délai. */
  lateCount: number;
  /** Rubrique dominante de ce qu'il reste à faire. */
  domain?: string;
  /** Difficulté la plus haute encore en jeu. */
  hardest?: Difficulty;
  /** Ce que Lennyx mettrait en avant maintenant. */
  nextTask?: string;
  /** Pourquoi ce score — affiché dans le diagnostic, jamais deviné. */
  reasons: string[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Minutes depuis minuit, à partir d'un « HH:MM ». */
function toMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Journée « utile » : de 6 h à 22 h. Avant et après, on ne juge plus. */
const DAY_START = 6 * 60;
const DAY_END = 22 * 60;

/**
 * Fraction de la journée écoulée — c'est l'avancement que Lennyx ATTEND.
 * À 7 h il n'attend presque rien, à 21 h il attend presque tout.
 */
export function dayProgress(nowMinutes: number): number {
  return clamp((nowMinutes - DAY_START) / (DAY_END - DAY_START), 0, 1);
}

/** Somme d'XP sur une fenêtre de jours se terminant la veille de `offset`. */
function xpWindow(profile: Profile, today: string, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += profile.history[addDays(today, -i)] ?? 0;
  return sum;
}

/** Empreinte stable d'une chaîne — pour choisir une phrase sans aléa par rendu. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function computeMood(
  ctx: MoodContext,
  opts: { today?: string; nowMinutes?: number } = {},
): MoodState {
  const { profile, quests, dailies } = ctx;
  const today = opts.today ?? todayStr();
  const nowMin = opts.nowMinutes ?? toMinutes(nowTimeStr());
  const reasons: string[] = [];

  // ── ce qu'il y a à faire aujourd'hui ──
  const scheduled = dailies.filter((d) => isScheduledOn(d.days, today));
  const doneToday = scheduled.filter((d) => d.lastCompletedDate === today).length;
  const totalToday = scheduled.length;
  const pendingDailies = scheduled.filter((d) => d.lastCompletedDate !== today);
  const activeQuests = quests.filter((q) => !q.completedAt);

  let score = 55;

  // ── 1. avancement réel contre avancement attendu (le poids principal) ──
  const expected = dayProgress(nowMin);
  if (totalToday > 0) {
    const rate = doneToday / totalToday;
    const delta = rate - expected;
    const contrib = clamp(delta * 48, -30, 26);
    score += contrib;
    reasons.push(
      `${doneToday}/${totalToday} quotidiennes · attendu ${Math.round(expected * 100)} % → ${contrib >= 0 ? '+' : ''}${Math.round(contrib)}`,
    );
  } else {
    reasons.push('aucune quotidienne programmée aujourd’hui');
  }

  // ── 2. retards : chronométrées dépassées, quêtes hors délai ──
  const lateDailies = pendingDailies.filter((d) => d.timeLimit && !isOnTimeAt(d.timeLimit, nowMin)).length;
  const lateQuests = activeQuests.filter((q) => q.deadline && q.deadline < today).length;
  const lateCount = lateDailies + lateQuests;
  if (lateCount > 0) {
    const contrib = -clamp(lateCount * 7, 0, 26);
    score += contrib;
    reasons.push(`${lateCount} retard(s) → ${Math.round(contrib)}`);
  }

  // ── 3. streak global ──
  if (profile.currentStreak > 0) {
    const contrib = clamp(profile.currentStreak * 1.2, 0, 16);
    score += contrib;
    reasons.push(`streak ${profile.currentStreak} j → +${Math.round(contrib)}`);
  } else {
    score -= 6;
    reasons.push('aucun streak → -6');
  }

  // ── 4. tendance sur deux semaines ──
  const xp7 = xpWindow(profile, today, 0, 7);
  const xpPrev7 = xpWindow(profile, today, 7, 14);
  if (xpPrev7 > 0) {
    const contrib = clamp((xp7 / xpPrev7 - 1) * 20, -12, 12);
    score += contrib;
    reasons.push(`tendance 7 j ${xp7} contre ${xpPrev7} → ${contrib >= 0 ? '+' : ''}${Math.round(contrib)}`);
  } else if (xp7 > 0) {
    score += 8;
    reasons.push('premiers jours d’activité → +8');
  }

  // ── 5. pas du jour ──
  // ⚠️ Même indulgence que pour les quotidiennes : à 7 h du matin, personne
  // n'a fait ses 8 000 pas. On compare donc à l'avancement ATTENDU, pas à
  // l'objectif brut — sans ça, l'icône était orange chaque matin au réveil.
  if (profile.steps.goal > 0) {
    const pct = stepsOn(profile, today) / profile.steps.goal;
    const contrib = pct >= 1 ? 6 : clamp((pct - expected) * 9, -5, 5);
    score += contrib;
    reasons.push(`pas ${Math.round(pct * 100)} % de l’objectif → ${contrib >= 0 ? '+' : ''}${Math.round(contrib)}`);
  }

  // ── 6. combo du jour ──
  if (profile.combo > 1) {
    const contrib = clamp((profile.combo - 1) * 0.9, 0, 7);
    score += contrib;
    reasons.push(`combo ×${profile.combo} → +${Math.round(contrib)}`);
  }

  // ── 7. journée parfaite : Lennyx le remarque tout de suite ──
  if (totalToday > 0 && doneToday === totalToday && lateCount === 0) {
    score += 10;
    reasons.push('journée bouclée → +10');
  }

  // ── 8. abandon : plus rien depuis avant-hier, aucun score ne tient ──
  // ⚠️ Distinguer l'ABANDON du PREMIER JOUR. Un profil qui n'a jamais rien
  // fait n'a rien déserté : accueillir un nouvel arrivant avec un visage
  // inquiet est à la fois faux et décourageant. On lui garantit au contraire
  // un plancher serein le temps qu'il ait un historique.
  const lastActive = profile.lastActiveDate;
  const neverActive = !lastActive && Object.keys(profile.history).length === 0;
  if (neverActive) {
    score = Math.max(score, 58);
    reasons.push('tout premier jour → Lennyx accueille, il ne juge pas');
  } else if (!lastActive || lastActive < addDays(today, -1)) {
    score = Math.min(score, 24);
    reasons.push(`inactif depuis ${lastActive ?? 'toujours'} → plafonné à 24`);
  }

  score = Math.round(clamp(score, 0, 100));
  const def = MOODS.find((m) => score >= m.min) ?? MOODS[MOODS.length - 1];

  // ── ce que Lennyx met en avant ──
  const timedFirst = [...pendingDailies].sort((a, b) => {
    if (a.timeLimit && b.timeLimit) return a.timeLimit.localeCompare(b.timeLimit);
    if (a.timeLimit) return -1;
    if (b.timeLimit) return 1;
    return 0;
  });
  const soonestQuest = [...activeQuests]
    .filter((q) => q.deadline)
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))[0];
  const nextTask = timedFirst[0]?.title ?? soonestQuest?.title ?? activeQuests[0]?.title;

  // rubrique dominante et difficulté la plus haute de ce qui reste
  const tally: Record<string, number> = {};
  let hardestIdx = -1;
  for (const item of [...pendingDailies, ...activeQuests]) {
    if (item.category) tally[item.category] = (tally[item.category] ?? 0) + 1;
    const idx = DIFFICULTY_ORDER.indexOf(item.difficulty);
    if (idx > hardestIdx) hardestIdx = idx;
  }
  const domain = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    id: def.id,
    label: def.label,
    score,
    line: def.lines[hash(`${today}:${def.id}`) % def.lines.length],
    doneToday,
    totalToday,
    lateCount,
    domain,
    hardest: hardestIdx >= 0 ? DIFFICULTY_ORDER[hardestIdx] : undefined,
    nextTask,
    reasons,
  };
}

/**
 * Variante de `isOnTime` à instant injectable : le moteur d'humeur doit pouvoir
 * se tester à 7 h comme à 21 h sans toucher l'horloge de la machine.
 */
function isOnTimeAt(limit: string, nowMinutes: number): boolean {
  return nowMinutes <= toMinutes(limit);
}
