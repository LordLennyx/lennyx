// ── Banque de messages de relance (le côté Duolingo de Lennyx) ────────────
// Trois intensités : discret (sobre), normal, duolingo (insistant, joueur,
// légèrement culpabilisant — pour la discipline, avec amour).

export type Intensity = 'discret' | 'normal' | 'duolingo';

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

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

export function lastcallMsg(intensity: Intensity, title: string, limit: string): string {
  if (intensity === 'discret') return `La fenêtre de « ${title} » est passée (${limit}).`;
  if (intensity === 'normal') return `Trop tard pour « ${title} » — valide quand même pour une demi-récompense.`;
  return pick([
    `${limit} est passée et « ${title} » aussi. Le streak, lui, s'en souviendra.`,
    `« ${title} » vient d'expirer. La demi-récompense t'attend — la prochaine fois, sois là avant ${limit}.`,
  ]);
}
