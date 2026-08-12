// ── Banque de messages de relance (le côté Duolingo de Lennyx) ────────────
// Trois intensités : discret (sobre), normal, duolingo (insistant, joueur,
// légèrement culpabilisant — pour la discipline, avec amour).
//
// Les messages sont CONTEXTUELS : ils citent la tâche, le temps qu'il reste,
// le streak en jeu. Un rappel générique se fait ignorer, un rappel précis non.

import type { Difficulty } from '../game/engine';

export type Intensity = 'discret' | 'normal' | 'duolingo';

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

/** « 45 min », « 1 h 05 », « 2 h » — lisible d'un coup d'œil. */
export function humanDelay(minutes: number): string {
  if (minutes <= 0) return "maintenant";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

const DIFFICULTY_WORD: Record<Difficulty, string> = {
  easy: 'simple',
  normal: 'à faire',
  hard: 'exigeante',
  epic: 'épique',
};

// ── Rappels d'échéance ────────────────────────────────────────────────────

export function reminderMsg(
  intensity: Intensity,
  title: string,
  minutesLeft: number,
  limit: string,
  difficulty: Difficulty,
  streak: number,
): string {
  const left = humanDelay(minutesLeft);
  if (intensity === 'discret') return `${left} avant ${limit}.`;
  if (intensity === 'normal') {
    return pick([
      `Il te reste ${left} avant ${limit}.`,
      `${limit}, c'est dans ${left}. Tu as le temps si tu t'y mets.`,
      `Échéance à ${limit} — ${left} de marge.`,
    ]);
  }
  return pick([
    `${left} avant ${limit}. Tâche ${DIFFICULTY_WORD[difficulty]} : ne la garde pas pour la fin.`,
    streak > 0
      ? `${left} au compteur. Ton streak de ${streak} jour(s) regarde ce que tu fais.`
      : `${left} avant ${limit}. On commence maintenant ou on invente une excuse ?`,
    `Chrono : ${left}. « ${title} » n'attend que toi.`,
    `${left}. C'est court. C'est largement suffisant. C'est maintenant.`,
  ]);
}

export function urgentMsg(
  intensity: Intensity,
  title: string,
  minutesLeft: number,
  limit: string,
  streak: number,
): string {
  const left = humanDelay(minutesLeft);
  if (intensity === 'discret') return `Plus que ${left} avant ${limit}.`;
  if (intensity === 'normal') {
    return pick([
      `Plus que ${left} ! « ${title} » avant ${limit}.`,
      `Dernière ligne droite : ${left} avant ${limit}.`,
    ]);
  }
  return pick([
    `${left.toUpperCase()} ! Après, c'est demi-récompense et streak brisé.`,
    streak > 0
      ? `${left} pour sauver ${streak} jour(s) de streak. Bouge.`
      : `${left}. Tu peux encore tout sauver. Vas-y.`,
    `Le sablier est presque vide : ${left}. « ${title} », maintenant.`,
  ]);
}

export function lastcallMsg(intensity: Intensity, title: string, limit: string): string {
  if (intensity === 'discret') return `La fenêtre de « ${title} » est passée (${limit}).`;
  if (intensity === 'normal') return `Trop tard pour « ${title} » — valide quand même pour une demi-récompense.`;
  return pick([
    `${limit} est passée et « ${title} » aussi. Le streak, lui, s'en souviendra.`,
    `« ${title} » vient d'expirer. La demi-récompense t'attend — la prochaine fois, sois là avant ${limit}.`,
    `Fenêtre manquée. Ce n'est pas un drame, c'est une donnée. Valide quand même.`,
  ]);
}

/** Relance APRÈS l'heure limite, tant que la tâche reste non faite. */
export function afterMsg(minutesLate: number, title: string): string {
  const late = humanDelay(minutesLate);
  return pick([
    `« ${title} » traîne depuis ${late}. Une demi-récompense vaut mieux que rien.`,
    `${late} de retard sur « ${title} ». On la solde maintenant ?`,
    `Toujours pas faite : « ${title} » (${late} de retard). L'Oracle n'oublie rien.`,
  ]);
}

// ── Quêtes à échéance ─────────────────────────────────────────────────────

export function questDeadlineMsg(intensity: Intensity, title: string, daysLeft: number): string {
  if (daysLeft < 0) {
    const late = Math.abs(daysLeft);
    return intensity === 'duolingo'
      ? `« ${title} » est en retard de ${late} jour(s). Elle ne va pas se faire toute seule.`
      : `« ${title} » a dépassé son échéance de ${late} jour(s).`;
  }
  if (daysLeft === 0) {
    return intensity === 'duolingo'
      ? `Dernier jour pour « ${title} ». Demain, ce sera du retard.`
      : `« ${title} » est à rendre aujourd'hui.`;
  }
  if (daysLeft === 1) return `Plus qu'un jour pour « ${title} ».`;
  return `« ${title} » : échéance dans ${daysLeft} jours.`;
}

// ── Relances générales ────────────────────────────────────────────────────

export function sentinelMsg(intensity: Intensity, count: number, streak: number, titles: string): string {
  if (intensity === 'discret') return `${count} quotidienne(s) en attente : ${titles}`;
  if (intensity === 'normal')
    return pick([
      `${count} quotidienne(s) attendent encore : ${titles}`,
      `La soirée avance — il reste : ${titles}`,
    ]);
  return pick([
    `Ces tâches ne vont pas se faire toutes seules : ${titles}. On y va ?`,
    streak > 0
      ? `Ton streak de ${streak} jour(s) est suspendu à un fil. ${titles} — tu sais ce qu'il te reste à faire.`
      : `Zéro pointé aujourd'hui ? ${titles} t'attendent toujours…`,
    `L'Oracle a remarqué que tu ignores : ${titles}. L'Oracle n'oublie jamais.`,
    `Encore ${count} tâche(s) et ta journée est parfaite. Ce serait dommage de s'arrêter là, non ?`,
  ]);
}

/** Relance horaire du mode Duolingo : varie selon l'heure qu'il est. */
export function hourlyNagMsg(hour: number, pending: number, streak: number): string {
  if (hour < 10) {
    return pick([
      `La matinée commence. ${pending} tâche(s) t'attendent — prends de l'avance.`,
      `Les meilleures journées se gagnent avant 10h. ${pending} en attente.`,
    ]);
  }
  if (hour < 14) {
    return pick([
      `Midi approche et ${pending} tâche(s) dorment encore. On en coche une ?`,
      `Point d'étape : ${pending} en attente. Une seule suffit pour lancer la machine.`,
    ]);
  }
  if (hour < 18) {
    return pick([
      `L'après-midi file. ${pending} tâche(s) toujours là.`,
      `${pending} en attente. Le toi de ce soir te remerciera.`,
    ]);
  }
  if (hour < 22) {
    return streak > 0
      ? `${pending} tâche(s) et ${streak} jour(s) de streak en jeu. La soirée est encore jeune.`
      : `${pending} tâche(s) avant la fin de journée. Il est encore temps.`;
  }
  return pick([
    `Dernière ligne droite avant minuit : ${pending} tâche(s).`,
    `Minuit approche. ${pending} tâche(s) — sauve ce qui peut l'être.`,
  ]);
}

export function middayMsg(streak: number): string {
  return pick([
    'Il est midi passé et ton journal est vierge. Ce n’est pas le héros que je connais.',
    streak > 0
      ? `${streak} jour(s) de streak, et aujourd'hui… rien encore ? Répare ça.`
      : 'La journée est à moitié écoulée. Une seule tâche suffit pour lancer la machine.',
    'Petit rappel amical : la discipline ne prend pas de pause déjeuner.',
    'Lennyx se sent seul. Une petite quête pour la route ?',
  ]);
}

export function guiltMsg(streak: number): string {
  return pick([
    `L'après-midi file. Ton streak de ${streak} jour(s) me supplie de t'écrire.`,
    'Tu te souviens de tes objectifs ? Eux se souviennent de toi.',
    `Encore rien aujourd'hui. Le toi de demain jugera le toi de ce soir.`,
    'Ce message est exactement aussi agaçant que ton inaction. Coïncidence ?',
  ]);
}

export function briefingMsg(intensity: Intensity, count: number, timed: number): string {
  if (count === 0) return 'Rien de programmé — la bibliothèque regorge d’idées.';
  const base = `${count} quotidienne(s) t'attendent${timed > 0 ? `, dont ${timed} chronométrée(s)` : ''}.`;
  if (intensity !== 'duolingo') return base;
  return pick([
    `${base} Le premier qui bouge gagne : toi ou ta flemme ?`,
    `${base} L'aube appartient aux conquérants.`,
    `${base} Chaque minute d'avance est un combo qui t'attend.`,
  ]);
}

/** Dernier avertissement avant minuit : le streak global se joue là. */
export function midnightMsg(pending: number, streak: number, nothingToday: boolean): string {
  if (nothingToday && streak > 0) {
    return `Il te reste moins d'une heure pour sauver ${streak} jour(s) de streak. Une tâche. Une seule.`;
  }
  if (nothingToday) return `Minuit approche et la journée est vide. Une tâche suffit pour repartir.`;
  return `${pending} tâche(s) encore ouvertes avant minuit.`;
}
