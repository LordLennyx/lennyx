// ── Compréhension des commandes dictées en français ──────────────────────
// 100 % local, aucune API, aucun modèle : des tables de mots et des
// expressions régulières tolérantes aux accents. C'est ce module qui permet
// d'annoncer sa journée à voix haute — « crée une quotidienne chronométrée
// arriver à l'école avant 7h30 en semaine, difficile » — et de voir apparaître
// la tâche avec TOUS ses paramètres.
//
// Architecture : on découpe la dictée en segments (une intention par segment),
// puis chaque segment est réduit par retraits successifs. Ce qui reste après
// avoir extrait les paramètres est le titre — c'est ce qui garantit une
// transcription fidèle : on n'invente rien, on ne fait que retirer les mots de
// commande reconnus.
//
// ⚠️ Le parseur ne crée JAMAIS rien lui-même : il renvoie des brouillons que
// l'utilisateur valide (VoiceCapture.tsx). Une dictée mal comprise doit se
// corriger en un geste, pas produire une tâche fantôme.

import { addDays, dayOfWeek, toDateStr, todayStr, uid, type Difficulty } from '../game/engine';
import { deaccent, normalizeNumbers, parseAmount } from './frenchNumbers';

export type DraftKind = 'quest' | 'daily' | 'note' | 'resolution' | 'win' | 'expense' | 'income';

export interface VoiceDraft {
  id: string;
  kind: DraftKind;
  /** Le segment dicté d'origine, affiché tel quel pour vérification. */
  raw: string;
  /** Titre (quête, quotidienne), libellé (finance) ou texte (note). */
  title: string;
  description: string;
  difficulty: Difficulty;
  isEvent: boolean;
  category?: string; // id de rubrique (library.ts)
  deadline?: string; // YYYY-MM-DD — quête
  days: number[]; // quotidienne (vide = tous les jours)
  timeLimit?: string; // HH:MM — quotidienne chronométrée
  subquests: string[];
  amount?: number; // finance
  txCategory?: string; // finance
  /** Libellés de ce qui a été reconnu — affichés sous le brouillon. */
  flags: string[];
}

export interface VoiceParseResult {
  /** La dictée brute, jamais retouchée. */
  transcript: string;
  drafts: VoiceDraft[];
}

// ═══════════════ fabrication de motifs tolérants ═══════════════

const CLASSES: Record<string, string> = {
  a: 'aàâä', c: 'cç', e: 'eéèêë', i: 'iîï', o: 'oôö', u: 'uùûü', y: 'yÿ',
};

/**
 * Transforme un mot français en motif qui accepte toutes les variantes
 * d'accentuation : les moteurs de reconnaissance (et les claviers pressés)
 * écrivent aussi bien « quête » que « quete ».
 */
function acc(src: string): string {
  let out = '';
  for (const ch of deaccent(src)) {
    // espace et trait d'union sont interchangeables à l'oral : la
    // reconnaissance vocale écrit aussi bien « petit-déjeuner » que
    // « petit déjeuner », « week-end » que « week end »
    if (ch === ' ' || ch === '-') out += "[\\s'’-]+";
    else if (ch === "'") out += "['’]?";
    else if (CLASSES[ch]) out += `[${CLASSES[ch]}]`;
    else if (/[a-z0-9]/.test(ch)) out += ch;
    // ⚠️ en mode unicode (/u), échapper un caractère quelconque lève
    // « Invalid escape » : on n'échappe que les métacaractères.
    else if ('^$\\.*+?()[]{}|/'.includes(ch)) out += `\\${ch}`;
    else out += ch;
  }
  return out;
}

/** Alternance de mots, tolérante aux accents : w('quête','tâche') */
const w = (...words: string[]) => `(?:${words.map(acc).join('|')})`;

const re = (pattern: string, flags = 'i') => new RegExp(pattern, flags);

// ═══════════════ tables de vocabulaire ═══════════════

const DIFFICULTY_WORDS: Array<[Difficulty, string[]]> = [
  ['epic', ['épique', 'extrême', 'colossal', 'colossale', 'titanesque', 'monumental', 'monumentale', 'énorme', 'légendaire']],
  ['hard', ['difficile', 'dur', 'dure', 'ardu', 'ardue', 'exigeant', 'exigeante', 'costaud', 'compliqué', 'compliquée', 'pénible']],
  ['easy', ['facile', 'simple', 'rapide', 'léger', 'légère', 'facultatif', 'anodin']],
  ['normal', ['normal', 'normale', 'moyen', 'moyenne', 'standard', 'ordinaire']],
];

const DAY_WORDS: Array<[number, string[]]> = [
  [1, ['lundi', 'lundis']],
  [2, ['mardi', 'mardis']],
  [3, ['mercredi', 'mercredis']],
  [4, ['jeudi', 'jeudis']],
  [5, ['vendredi', 'vendredis']],
  [6, ['samedi', 'samedis']],
  [0, ['dimanche', 'dimanches']],
];

const MONTHS: Array<[number, string[]]> = [
  [1, ['janvier']], [2, ['février', 'fevrier']], [3, ['mars']], [4, ['avril']],
  [5, ['mai']], [6, ['juin']], [7, ['juillet']], [8, ['août', 'aout']],
  [9, ['septembre']], [10, ['octobre']], [11, ['novembre']], [12, ['décembre', 'decembre']],
];

/**
 * Mots-clés par rubrique de la bibliothèque. Ils servent UNIQUEMENT à devenir
 * la rubrique du brouillon — jamais à être retirés du titre : « aller à
 * l'école » doit rester « aller à l'école », pas « aller à ».
 */
const DOMAIN_WORDS: Array<[string, string[]]> = [
  ['etudes', ['école', 'ecole', 'cours', 'étude', 'études', 'étudier', 'révision', 'révisions', 'réviser', 'devoir', 'devoirs', 'examen', 'examens', 'fac', 'université', 'lycée', 'collège', 'leçon', 'leçons', 'apprendre', 'apprentissage', 'bac', 'partiel', 'maths', 'mathématiques', 'physique', 'chimie', 'histoire', 'géographie', 'exposé', 'mémoire', 'thèse', 'concours']],
  ['travail', ['travail', 'boulot', 'bureau', 'job', 'taf', 'professionnel', 'réunion', 'client', 'clients', 'collègue', 'collègues', 'dossier', 'rapport', 'mail', 'mails', 'entretien', 'patron', 'chantier', 'livrable', 'deadline']],
  ['sport', ['sport', 'courir', 'course', 'jogging', 'footing', 'muscu', 'musculation', 'pompes', 'abdos', 'gym', 'vélo', 'natation', 'nager', 'cardio', 'entraînement', 'entrainement', 'échauffement', 'étirements', 'squats', 'tractions', 'salle de sport', 'marcher', 'match', 'football', 'basket']],
  ['hygiene', ['hygiène', 'douche', 'dents', 'brosser', 'soin', 'soins', 'peau', 'coiffeur', 'ongles', 'barbe', 'médecin', 'dentiste', 'pharmacie', 'médicament']],
  ['nutrition', ['cuisine', 'cuisiner', 'manger', 'repas', 'nutrition', 'légumes', 'fruits', 'boire de l\'eau', 'petit-déjeuner', 'déjeuner', 'dîner', 'recette', 'courses', 'marché', 'protéines', 'sucre']],
  ['maison', ['maison', 'ménage', 'ranger', 'rangement', 'vaisselle', 'linge', 'lessive', 'balayer', 'nettoyer', 'poubelle', 'ordures', 'garage', 'chambre', 'bricolage', 'jardin', 'repasser', 'aspirateur', 'lit']],
  ['finances', ['finance', 'finances', 'budget', 'épargne', 'épargner', 'économiser', 'facture', 'factures', 'banque', 'compte', 'loyer', 'investir', 'dette', 'dettes']],
  ['social', ['ami', 'amis', 'amie', 'famille', 'parents', 'maman', 'papa', 'mère', 'père', 'frère', 'sœur', 'soeur', 'cousin', 'appeler', 'téléphoner', 'visite', 'anniversaire', 'mariage', 'oncle', 'tante']],
  ['esprit', ['méditation', 'méditer', 'respiration', 'respirer', 'zen', 'bien-être', 'gratitude', 'yoga', 'pleine conscience', 'stress', 'souffler', 'calme intérieur', 'sophrologie']],
  ['creativite', ['dessin', 'dessiner', 'écrire', 'écriture', 'peinture', 'peindre', 'photo', 'photographie', 'guitare', 'piano', 'chanter', 'composer', 'créatif', 'créativité', 'poème', 'roman', 'montage']],
  ['tech', ['code', 'coder', 'programmer', 'programmation', 'informatique', 'développement', 'développer', 'ordinateur', 'bug', 'github', 'site web', 'application', 'serveur', 'base de données', 'script']],
  ['amour', ['amoureuse', 'copine', 'copain', 'conjoint', 'conjointe', 'mari', 'épouse', 'couple', 'chérie', 'chéri', 'rendez-vous galant', 'saint-valentin']],
  ['spiritualite', ['spiritualité', 'spirituel', 'prière', 'prier', 'foi', 'église', 'mosquée', 'bible', 'coran', 'dieu', 'âme', 'messe', 'jeûne', 'culte']],
  ['animaux', ['animal', 'animaux', 'chien', 'chat', 'chatte', 'aquarium', 'litière', 'croquettes', 'vétérinaire']],
  ['sorties', ['sortie', 'sortir', 'aventure', 'randonnée', 'voyage', 'exploration', 'explorer', 'cinéma', 'plage', 'balade', 'promenade', 'musée', 'concert', 'découvrir', 'vacances']],
  ['admin', ['administratif', 'papiers', 'paperasse', 'démarche', 'démarches', 'impôts', 'passeport', 'carte d\'identité', 'mairie', 'préfecture', 'assurance', 'formulaire', 'inscription', 'visa', 'contrat']],
  ['style', ['vêtement', 'vêtements', 'habits', 'tenue', 'mode', 'coiffure', 'shopping', 'style', 'chaussures', 'repassage']],
  ['sommeil', ['sommeil', 'dormir', 'coucher', 'sieste', 'nuit', 'insomnie', 'se lever', 'réveil']],
];

/** Catégories de transaction : un mot suffit à les étiqueter. */
const TX_CATEGORIES: Array<[string, string[]]> = [
  ['Transport', ['transport', 'taxi', 'bus', 'moto', 'essence', 'carburant', 'ticket', 'train', 'avion', 'péage', 'course']],
  ['Nourriture', ['nourriture', 'manger', 'repas', 'restaurant', 'resto', 'courses', 'marché', 'provision', 'provisions', 'alimentation', 'petit-déjeuner', 'déjeuner', 'dîner']],
  ['Logement', ['loyer', 'logement', 'maison', 'électricité', 'eau', 'gaz', 'internet', 'wifi', 'charges']],
  ['Santé', ['santé', 'pharmacie', 'médicament', 'médecin', 'hôpital', 'dentiste', 'consultation']],
  ['École', ['école', 'scolarité', 'frais de scolarité', 'fournitures', 'livre', 'livres', 'inscription', 'université']],
  ['Communication', ['crédit', 'forfait', 'téléphone', 'recharge', 'appel', 'données', 'abonnement']],
  ['Loisirs', ['loisir', 'loisirs', 'cinéma', 'sortie', 'jeu', 'jeux', 'concert', 'bar', 'fête']],
  ['Salaire', ['salaire', 'paie', 'paye', 'traitement', 'solde']],
  ['Cadeau', ['cadeau', 'cadeaux', 'don', 'offert']],
  ['Vente', ['vente', 'vendu', 'revente', 'commission']],
  ['Famille', ['famille', 'parents', 'maman', 'papa', 'frère', 'sœur', 'enfant']],
];

const CURRENCY = w('francs', 'franc', 'fcfa', 'cfa', 'xaf', 'euros', 'euro', 'dollars', 'dollar', 'balles', 'centimes') + `|€|\\$`;

// ═══════════════ découpage en segments ═══════════════

/** Verbes et noms qui ouvrent une nouvelle intention. */
const OPENERS = w(
  'ajoute', 'ajouter', 'crée', 'créer', 'cree', 'creer', 'nouvelle', 'nouveau',
  'note', 'noter', 'enregistre', 'inscris', 'programme', 'rappelle-moi',
  'dépense', 'dépensé', 'revenu', 'victoire', 'résolution', 'quotidienne',
  'quête', 'tâche', 'je dois', 'il faut que je', 'j\'ai dépensé', 'j\'ai reçu',
  'j\'ai gagné', 'j\'ai payé', 'j\'ai acheté',
);

/** Connecteurs qui séparent franchement deux commandes dictées d'affilée. */
const SEPARATORS = w(
  'ensuite', 'et ensuite', 'puis', 'et puis', 'après ça', 'après quoi',
  'et aussi', 'également', 'par ailleurs', 'autre chose', 'autre tâche',
  'deuxièmement', 'troisièmement', 'quatrièmement', 'd\'autre part',
);

/**
 * Découpe la dictée en commandes. Trois césures seulement, toutes franches :
 * la ponctuation forte, un connecteur explicite, ou un « et » / une virgule
 * immédiatement suivi d'un verbe de création. On ne coupe jamais sur un simple
 * « et », sans quoi « ranger le garage et le grenier » deviendrait deux tâches.
 */
export function splitSegments(text: string): string[] {
  let s = text.replace(/\s+/g, ' ').trim();
  const MARK = '\u0001';
  s = s.replace(re(`[.;!?\\n]+`, 'g'), MARK);
  s = s.replace(re(`(?:^|[,\\s])${SEPARATORS}\\b[\\s,:]*`, 'gi'), MARK);
  // ⚠️ La césure ne se déclenche QUE sur une virgule ou un « et » explicite.
  // Accepter n'importe quelle espace couperait « ajoute une quête ranger le
  // garage » juste avant « quête » — la commande se retrouvait en miettes.
  s = s.replace(
    re(`(?:,\\s*|\\s+${acc('et')}\\s+)(?=(?:${w('une', 'un', 'ma', 'mon')}\\s+)?${OPENERS}\\b)`, 'gi'),
    MARK,
  );
  return s.split(MARK).map((x) => x.trim()).filter((x) => x.replace(/[^\p{L}\p{N}]/gu, '').length > 1);
}

// ═══════════════ retraits successifs ═══════════════

interface Cutter {
  text: string;
  take(pattern: RegExp): RegExpMatchArray | null;
  drop(pattern: RegExp): void;
}

function cutter(initial: string): Cutter {
  const c: Cutter = {
    text: initial,
    take(pattern) {
      const m = c.text.match(pattern);
      if (!m || m.index === undefined) return null;
      c.text = `${c.text.slice(0, m.index)} ${c.text.slice(m.index + m[0].length)}`;
      return m;
    },
    drop(pattern) {
      c.text = c.text.replace(pattern, ' ');
    },
  };
  return c;
}

/** Nettoyage final d'un titre : mots de liaison orphelins, ponctuation, casse. */
function tidy(s: string): string {
  let t = s.replace(/\s+/g, ' ').trim();
  // ponctuation et liaisons laissées en bord par les retraits
  const edge = w('et', 'de', 'du', 'des', 'la', 'le', 'les', 'à', 'au', 'aux', 'en', 'pour', 'dans', 'd\'', 'l\'', 'que', 'qui', 'c\'est');
  for (let i = 0; i < 4; i++) {
    t = t.replace(re(`^[\\s,:;.\\-–—]+`), '').replace(re(`[\\s,:;.\\-–—]+$`), '');
    t = t.replace(re(`^${edge}\\s+`), '').replace(re(`\\s+${edge}$`), '');
  }
  t = t.replace(/\s+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

// ═══════════════ extracteurs de paramètres ═══════════════

function takeDifficulty(c: Cutter): Difficulty | null {
  for (const [diff, words] of DIFFICULTY_WORDS) {
    // « assez difficile », « très dur », « plutôt facile » : l'adverbe part aussi
    const m = c.take(re(`(?:^|[\\s,:])(?:${w('très', 'assez', 'plutôt', 'vraiment', 'super', 'un peu')}\\s+)?${w(...words)}(?=[\\s,.;:]|$)`));
    if (m) return diff;
  }
  return null;
}

function detectDomain(s: string): string | undefined {
  let best: string | undefined;
  let bestScore = 0;
  for (const [id, words] of DOMAIN_WORDS) {
    let score = 0;
    for (const word of words) if (re(`(?:^|[^\\p{L}])${w(word)}(?:[^\\p{L}]|$)`, 'iu').test(s)) score++;
    if (score > bestScore) { bestScore = score; best = id; }
  }
  return best;
}

/** « rubrique maison », « catégorie travail », « domaine école » — explicite. */
function takeExplicitDomain(c: Cutter): string | undefined {
  const m = c.take(re(`(?:${w('dans la', 'dans le', 'en')}\\s+)?${w('rubrique', 'catégorie', 'domaine', 'section')}\\s*:?\\s*([\\p{L}'’-]+(?:\\s+[\\p{L}'’-]+)?)`, 'iu'));
  if (!m) return undefined;
  return detectDomain(m[1]);
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function daysIn(s: string): number[] {
  const out: number[] = [];
  for (const [n, words] of DAY_WORDS) {
    if (re(`(?:^|[^\\p{L}])${w(...words)}(?:[^\\p{L}]|$)`, 'iu').test(s) && !out.includes(n)) out.push(n);
  }
  return out;
}

interface Schedule {
  days: number[];
  recurring: boolean;
}

/**
 * Jours de programmation d'une quotidienne. Gère « tous les jours », « en
 * semaine », « le week-end », l'énumération (« lundi, mercredi et vendredi »)
 * et surtout l'exclusion (« tous les jours sauf le dimanche »), qu'on ne peut
 * pas exprimer autrement à l'oral.
 */
function takeSchedule(c: Cutter): Schedule {
  let recurring = false;
  let days: number[] = [];

  const except = c.take(re(`${w('sauf', 'excepté', 'hormis', 'à part', 'mais pas')}\\s+(?:${w('le', 'les', 'la')}\\s+)?((?:[\\p{L}'’-]+(?:[\\s,]+(?:${acc('et')}\\s+)?)?){1,7})`, 'iu'));
  const excluded = except ? daysIn(except[1]) : [];

  if (c.take(re(`${w('tous les jours', 'chaque jour', 'quotidiennement', 'tous les matins', 'chaque matin', 'tous les soirs', 'chaque soir', 'au quotidien')}`))) {
    recurring = true;
  }
  // ⚠️ Pas de « la semaine » tout court dans cette liste : elle dévorait le
  // début de « la semaine prochaine », qui est une échéance, pas un rythme.
  if (c.take(re(`${w('en semaine', 'jours ouvrés', 'jours ouvrables', 'du lundi au vendredi', 'les jours de semaine')}`))) {
    recurring = true;
    days.push(1, 2, 3, 4, 5);
  }
  if (c.take(re(`${w('le week-end', 'les week-ends', 'week-end', 'weekend', 'le weekend', 'fin de semaine')}`))) {
    recurring = true;
    for (const n of [6, 0]) if (!days.includes(n)) days.push(n);
  }

  // Énumération de jours : « tous les lundis et jeudis », « le mardi ».
  // ⚠️ Un jour SANS déterminant de répétition n'est pas une programmation,
  // c'est une date : « prépare la fête samedi » est une quête pour samedi,
  // pas une routine du samedi. Seul le déterminant fait la récurrence.
  const enumerated = c.take(re(
    `(?:(${w('tous les', 'toutes les', 'chaque', 'les', 'le')})\\s+)?` +
    `((?:${w(...DAY_WORDS.flatMap(([, ws]) => ws))}(?:[\\s,]+(?:${acc('et')}\\s+)?)?){1,7})`, 'i',
  ));
  if (enumerated) {
    if (enumerated[1]) recurring = true;
    for (const n of daysIn(enumerated[2])) if (!days.includes(n)) days.push(n);
  }

  if (excluded.length > 0) {
    const base = days.length > 0 ? days : ALL_DAYS;
    days = base.filter((d) => !excluded.includes(d));
    recurring = true;
  }

  // « tous les jours » + rien d'autre : days vide = tous les jours (convention)
  days.sort((a, b) => a - b);
  return { days, recurring };
}

const HOUR_PART = `(\\d{1,2})\\s*(?:${w('heures', 'heure')}|h|:)\\s*(\\d{1,2})?`;

function hm(h: number, m: number): string {
  const hh = Math.max(0, Math.min(23, h));
  const mm = Math.max(0, Math.min(59, m));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Heure limite. Accepte « avant 7h30 », « avant 7 heures et demie », « à midi »,
 * « avant huit heures du soir » (les mots-nombres ont déjà été réécrits en
 * chiffres en amont par normalizeNumbers).
 */
function takeTime(c: Cutter): string | undefined {
  const trigger = `(?:${w('avant', 'au plus tard à', 'au plus tard', 'pas après', 'pour', 'à', 'vers', 'dès', 'de')}\\s+)?`;

  const noon = c.take(re(`${trigger}${w('midi', 'minuit')}`));
  if (noon) return /minuit/i.test(noon[0]) ? '00:00' : '12:00';

  const m = c.take(re(`${trigger}${HOUR_PART}\\s*(?:(${w('et demie', 'et demi', 'et quart', 'trente', 'quinze')})|(${w('moins le quart')}))?\\s*(${w('du matin', 'du soir', 'de l\'après-midi', 'de l\'apres-midi', 'de la nuit')})?`));
  if (!m) return undefined;

  let h = parseInt(m[1], 10);
  let min = m[2] ? parseInt(m[2], 10) : 0;
  const frac = (m[3] ?? '').toLowerCase();
  if (/demi/.test(frac) || /trente/.test(frac)) min = 30;
  else if (/quart/.test(frac) || /quinze/.test(frac)) min = 15;
  if (m[4]) { min = 45; h = h - 1; } // « moins le quart »
  const period = (m[5] ?? '').toLowerCase();
  if (/soir|nuit|apr/.test(period) && h < 12) h += 12;
  if (/matin/.test(period) && h === 12) h = 0;
  if (h < 0) h = 0;
  return hm(h, min);
}

/** Prochaine occurrence d'un jour de la semaine, strictement après `from`. */
function nextWeekday(from: string, dow: number): string {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(from, i);
    if (dayOfWeek(d) === dow) return d;
  }
  return addDays(from, 1);
}

function endOfMonth(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12));
}

/** Échéance d'une quête : tout ce qui situe une tâche dans le calendrier. */
function takeDeadline(c: Cutter, today: string): string | undefined {
  if (c.take(re(`${w('après-demain', 'apres demain')}`))) return addDays(today, 2);
  if (c.take(re(`(?:${w('pour', 'avant', 'd\'ici')}\\s+)?${w('demain')}`))) return addDays(today, 1);
  if (c.take(re(`${w('aujourd\'hui', 'ce soir', 'ce matin', 'cet après-midi', 'cette après-midi', 'dans la journée', 'tantôt')}`))) return today;

  const inN = c.take(re(`${w('dans', 'd\'ici')}\\s+(\\d+|${w('un', 'une')})\\s*(${w('jours', 'jour', 'semaines', 'semaine', 'mois')})`));
  if (inN) {
    const n = /^\d+$/.test(inN[1]) ? parseInt(inN[1], 10) : 1;
    const unit = deaccent(inN[2]);
    const mult = unit.startsWith('semaine') ? 7 : unit.startsWith('mois') ? 30 : 1;
    return addDays(today, n * mult);
  }

  if (c.take(re(`${w('la semaine prochaine', 'semaine prochaine', 'la semaine qui vient')}`))) return addDays(today, 7);
  if (c.take(re(`${w('le mois prochain', 'mois prochain')}`))) return addDays(today, 30);
  if (c.take(re(`${w('fin du mois', 'à la fin du mois', 'avant la fin du mois')}`))) return endOfMonth(today);

  // « le 15 novembre », « 3 mars »
  const dm = c.take(re(`(?:${w('le')}\\s+)?(\\d{1,2})(?:${acc('er')})?\\s+(${MONTHS.flatMap(([, ws]) => ws).map(acc).join('|')})`));
  if (dm) {
    const day = parseInt(dm[1], 10);
    const monthName = deaccent(dm[2]);
    const month = MONTHS.find(([, ws]) => ws.some((x) => deaccent(x) === monthName))?.[0] ?? 1;
    const year = new Date(`${today}T12:00:00`).getFullYear();
    let candidate = toDateStr(new Date(year, month - 1, day, 12));
    if (candidate < today) candidate = toDateStr(new Date(year + 1, month - 1, day, 12));
    return candidate;
  }

  // jour de la semaine : « pour vendredi », « lundi prochain »
  for (const [n, words] of DAY_WORDS) {
    const m = c.take(re(`(?:${w('pour', 'avant', 'ce', 'd\'ici')}\\s+)?${w(...words)}(?:\\s+${w('prochain', 'prochaine', 'qui vient')})?`));
    if (m) return nextWeekday(today, n);
  }

  // « le 15 » seul : ce mois-ci, ou le mois suivant si la date est passée
  const dayOnly = c.take(re(`${w('le')}\\s+(\\d{1,2})(?:${acc('er')})?(?=[\\s,.;:]|$)`));
  if (dayOnly) {
    const day = parseInt(dayOnly[1], 10);
    if (day >= 1 && day <= 31) {
      const d = new Date(`${today}T12:00:00`);
      let candidate = toDateStr(new Date(d.getFullYear(), d.getMonth(), day, 12));
      if (candidate < today) candidate = toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, day, 12));
      return candidate;
    }
  }
  return undefined;
}

function takeSubquests(c: Cutter): string[] {
  const m = c.take(re(`${w('avec', 'en')}?\\s*(?:${w('les', 'des')}\\s+)?${w('étapes', 'étape', 'sous-quêtes', 'sous-quête', 'sous-tâches', 'sous-tâche', 'jalons')}\\s*:?\\s*(.+)$`, 'i'));
  if (!m) return [];
  return m[1]
    .split(re(`\\s*(?:,|;|\\bet\\b|\\bpuis\\b|\\bensuite\\b)\\s*`, 'gi'))
    .map((x) => tidy(x))
    .filter((x) => x.length > 1)
    .slice(0, 12);
}

function takeDescription(c: Cutter): string {
  const m = c.take(re(`${w('description', 'précision', 'précisions', 'détail', 'détails', 'remarque')}\\s*:?\\s*(.+)$`, 'i'));
  return m ? tidy(m[1]) : '';
}

interface Amount {
  value: number;
  currencySeen: boolean;
}

function takeAmount(c: Cutter): Amount | null {
  // avec devise : la plus fiable, on la cherche d'abord
  const withCur = c.take(re(`(\\d[\\d\\s.,]*\\d|\\d)\\s*(?:${CURRENCY})\\b`, 'i'));
  if (withCur) {
    const v = parseAmount(withCur[1]);
    if (v !== null && v > 0) return { value: v, currencySeen: true };
  }
  const bare = c.take(re(`(?:^|[^\\d])(\\d[\\d\\s.,]*\\d|\\d)(?![\\d:h])`, 'i'));
  if (bare) {
    const v = parseAmount(bare[1]);
    if (v !== null && v > 0) return { value: v, currencySeen: false };
  }
  return null;
}

function detectTxCategory(s: string): string | undefined {
  for (const [label, words] of TX_CATEGORIES) {
    for (const word of words) {
      if (re(`(?:^|[^\\p{L}])${w(word)}(?:[^\\p{L}]|$)`, 'iu').test(s)) return label;
    }
  }
  return undefined;
}

// ═══════════════ détection d'intention ═══════════════

// Nettoyage des libellés de transaction (global : on retire toutes les
// occurrences). Volontairement large — ces motifs ne décident de RIEN.
const RX_EXPENSE = re(w('dépensé', 'dépense', 'dépenser', 'acheté', 'achat', 'payé', 'payer', 'réglé', 'déboursé', 'sorti', 'coûté', 'coûte', 'frais de', 'frais'), 'gi');
const RX_INCOME = re(w('revenus', 'revenu', 'reçu', 'recevoir', 'gagné', 'encaissé', 'touché', 'perçu', 'vendu', 'remboursé', 'rentrée d\'argent', 'entrée d\'argent'), 'gi');

// ⚠️ La DÉTECTION est stricte, elle. Une dépense est un fait accompli ou un
// mot d'argent explicite : « payer la facture le 15 novembre » est une tâche à
// faire, pas une sortie d'argent — c'est exactement le piège qu'on évite ici.
const RX_SPENT = re(
  `(?:${w('j\'ai', 'je viens de', 'on m\'a', 'nous avons', 'j\'avais')}\\s+${w('dépensé', 'payé', 'acheté', 'déboursé', 'réglé', 'sorti', 'perdu', 'donné')})`
  + `|(?:^|[\\s,:])${w('dépense', 'dépenses', 'achat', 'achats', 'sortie d\'argent')}(?=[\\s,:.]|$)`,
  'i',
);
const RX_EARNED = re(
  `(?:${w('j\'ai', 'je viens de', 'on m\'a', 'nous avons')}\\s+${w('reçu', 'gagné', 'touché', 'encaissé', 'vendu', 'perçu', 'été payé')})`
  // ⚠️ « paie » / « paye » seuls sont interdits ici : les motifs tolèrent les
  // accents, donc le nom « paye » matche le verbe « payé » — et « j'ai payé »
  // devenait un revenu. On n'accepte ces mots qu'avec leur possessif.
  + `|(?:^|[\\s,:])${w('revenu', 'revenus', 'salaire', 'ma paie', 'ma paye', 'entrée d\'argent', 'rentrée d\'argent')}(?=[\\s,:.]|$)`,
  'i',
);
/** Un montant accompagné de sa devise suffit à trancher : c'est de l'argent. */
const RX_PRICED = re(`\\d\\s*(?:${CURRENCY})\\b`, 'i');
const RX_WIN = re(`(?:^|[\\s,:])${w('victoire', 'j\'ai réussi', 'réussi à', 'j\'ai accompli', 'accomplissement', 'fier de', 'fière de', 'exploit', 'j\'ai gagné contre', 'j\'ai vaincu')}`, 'i');
const RX_RESOLUTION = re(`(?:^|[\\s,:])${w('résolution', 'je m\'engage', 'je promets', 'je décide de', 'mon engagement')}`, 'i');
const RX_NOTE = re(`(?:^|[\\s,:])(?:${w('note', 'noter', 'nouvelle note', 'prends note', 'pense-bête', 'dans mon journal', 'journal')})(?=[\\s,:.]|$)`, 'i');
const RX_DAILY = re(`${w('quotidienne', 'routine', 'habitude', 'rituel', 'tous les jours', 'chaque jour', 'quotidiennement', 'tous les matins', 'chaque matin', 'tous les soirs', 'chaque soir', 'en semaine', 'chaque semaine')}`, 'i');
const RX_QUEST = re(`${w('quête', 'quete', 'tâche', 'tache', 'mission', 'objectif', 'to-do', 'truc à faire')}`, 'i');
// ⚠️ Alternatives du plus long au plus court : avec « événement » en premier,
// « événement spécial » ne perdait que le premier mot et « spécial » restait
// collé au titre.
const EVENT_WORDS = ['événement spécial', 'événement exceptionnel', 'événement', 'evenement', 'spécial', 'spéciale', 'exceptionnel', 'majeur', 'capital'];
const RX_EVENT = re(w(...EVENT_WORDS), 'i');
const RX_EVENT_ALL = re(w(...EVENT_WORDS), 'gi');
const RX_TIMED = re(`${w('chronométrée', 'chronométré', 'chrono', 'minutée')}`, 'i');

/** Verbes de commande à retirer en tête de segment (ils ne sont pas le titre). */
const RX_OPENING = re(
  `^\\s*(?:${w('lennyx', 'oracle', 'dis', 'écoute')}\\s*[,:]?\\s*)?` +
  `(?:${w('s\'il te plaît', 'stp')}\\s*[,:]?\\s*)?` +
  `(?:${w('tu peux', 'peux-tu', 'je veux que tu', 'il faut que tu')}\\s+)?` +
  // « je dois méditer », « il faut que je range » : l'obligation n'est pas le titre
  `(?:${w('il faut que je', 'faut que je', 'il faudrait que je', 'je dois', 'je devrais', 'j\'ai besoin de', 'je veux')}\\s+)?` +
  // ⚠️ Le « de » / « d' » est accroché au verbe de commande, jamais seul :
  // « rappelle-moi d'appeler maman » → « appeler maman », sans amputer un
  // titre qui commencerait légitimement par « d'… ».
  `(?:${w('ajoute', 'ajouter', 'crée', 'créer', 'cree', 'creer', 'forge', 'forger', 'fais', 'faire', 'mets', 'met', 'mettre', 'enregistre', 'enregistrer', 'inscris', 'inscrire', 'programme', 'programmer', 'note', 'noter', 'consigne', 'consigner', 'rappelle-moi', 'rappelle moi', 'pense à')}` +
  // l'apostrophe est OBLIGATOIRE ici : sans elle, « fais du sport » perdrait
  // son « d » et deviendrait « u sport »
  `\\s*(?:${acc('de')}\\s+|d['’])?\\s*)?` +
  `(?:${w('moi', 'me')}\\s+)?` +
  `(?:${w('une nouvelle', 'un nouveau', 'nouvelle', 'nouveau', 'une', 'un', 'des', 'la', 'le', 'les')}\\s+)?` +
  `(?:${w('quête', 'quete', 'tâche', 'tache', 'mission', 'objectif', 'quotidienne', 'routine', 'habitude', 'rituel', 'événement spécial', 'événement', 'evenement', 'note', 'résolution', 'victoire', 'accomplissement', 'dépense', 'revenu', 'entrée', 'transaction')}\\s*)?` +
  `(?:${w('chronométrée', 'chronométré', 'minutée')}\\s*)?` +
  `(?:[-–—:,]\\s*|${w('qui s\'intitule', 'intitulée', 'intitulé', 'appelée', 'appelé', 'nommée', 'nommé', 'pour')}\\s+)?`,
  'i',
);

function detectKind(s: string): { kind: DraftKind; explicit: boolean } {
  if (RX_WIN.test(s)) return { kind: 'win', explicit: true };
  if (RX_RESOLUTION.test(s)) return { kind: 'resolution', explicit: true };
  const money = /\d/.test(s);
  // les faits d'argent déclarés passent avant tout
  if (money && RX_EARNED.test(s)) return { kind: 'income', explicit: true };
  if (money && RX_SPENT.test(s)) return { kind: 'expense', explicit: true };
  if (RX_NOTE.test(s)) return { kind: 'note', explicit: true };
  if (RX_DAILY.test(s)) return { kind: 'daily', explicit: true };
  if (RX_QUEST.test(s)) return { kind: 'quest', explicit: true };
  // un montant avec sa devise, sans aucun mot de tâche : c'est de l'argent
  if (money && RX_PRICED.test(s)) return { kind: 'expense', explicit: true };
  return { kind: 'quest', explicit: false };
}

// ═══════════════ parseur d'un segment ═══════════════

const KIND_LABEL: Record<DraftKind, string> = {
  quest: 'Quête',
  daily: 'Quotidienne',
  note: 'Note',
  resolution: 'Résolution',
  win: 'Victoire',
  expense: 'Dépense',
  income: 'Revenu',
};

export function kindLabel(kind: DraftKind): string {
  return KIND_LABEL[kind];
}

function parseSegment(raw: string, today: string): VoiceDraft | null {
  const segment = normalizeNumbers(raw);
  const { kind: detected, explicit } = detectKind(segment);

  const draft: VoiceDraft = {
    id: uid(),
    kind: detected,
    raw: raw.trim(),
    title: '',
    description: '',
    difficulty: 'normal',
    isEvent: false,
    days: [],
    subquests: [],
    flags: [],
  };

  // ── textes libres : on touche au minimum, la fidélité prime ──
  if (detected === 'note' || detected === 'resolution' || detected === 'win') {
    const c = cutter(segment);
    c.drop(re(`^\\s*(?:${w('ajoute', 'crée', 'créer', 'note', 'noter', 'enregistre', 'consigne', 'prends note', 'nouvelle', 'nouveau')}\\s+)?(?:${w('une', 'un', 'ma', 'mon', 'la', 'le')}\\s+)?(?:${w('note', 'résolution', 'victoire', 'accomplissement', 'pense-bête')})\\s*(?:${w('que', 'de', ':')}\\s*)?`, 'i'));
    c.drop(re(`^\\s*(?:${w('dans mon journal', 'journal')})\\s*[:,]?\\s*`, 'i'));
    c.drop(re(`^\\s*(?:${w('je m\'engage à', 'je promets de', 'je décide de')})\\s*`, 'i'));
    const text = tidy(c.text) || tidy(segment);
    if (!text) return null;
    draft.title = text;
    draft.flags.push(KIND_LABEL[detected]);
    return draft;
  }

  // ── finances ──
  if (detected === 'expense' || detected === 'income') {
    const c = cutter(segment);
    const amount = takeAmount(c);
    if (!amount) return null;
    draft.amount = amount.value;
    draft.flags.push(`${amount.value.toLocaleString('fr-FR')}${amount.currencySeen ? '' : ' (devise non dite)'}`);
    // le libellé est ce qui suit « pour / de / en / chez »
    const forWhat = c.take(re(`${w('pour', 'de', 'en', 'sur', 'chez', 'à cause de', 'à')}\\s+(?:${w('le', 'la', 'les', 'l\'', 'du', 'de la', 'des', 'un', 'une', 'mon', 'ma', 'mes')}\\s+)?(.+)$`, 'i'));
    c.drop(RX_EXPENSE);
    c.drop(RX_INCOME);
    c.drop(re(`^\\s*(?:${w('j\'ai', 'je', 'on m\'a', 'il y a eu')})\\s+`, 'i'));
    const label = tidy(forWhat ? forWhat[1] : c.text);
    draft.title = label || (detected === 'expense' ? 'Dépense' : 'Revenu');
    draft.txCategory = detectTxCategory(segment);
    if (draft.txCategory) draft.flags.push(draft.txCategory);
    return draft;
  }

  // ── quêtes et quotidiennes : tous les paramètres ──
  const c = cutter(segment);

  const timed = RX_TIMED.test(segment);
  if (RX_EVENT.test(segment)) {
    draft.isEvent = true;
    c.drop(RX_EVENT_ALL);
    draft.flags.push('Événement ×2');
  }
  c.drop(RX_TIMED);

  const subquests = takeSubquests(c);
  const description = takeDescription(c);

  const difficulty = takeDifficulty(c);
  if (difficulty) {
    draft.difficulty = difficulty;
    draft.flags.push({ easy: 'Facile', normal: 'Normal', hard: 'Difficile', epic: 'Épique' }[difficulty]);
  }

  const explicitDomain = takeExplicitDomain(c);

  const timeLimit = takeTime(c);
  const schedule = takeSchedule(c);

  // L'intention finale : « quotidienne » explicite, ou récurrence détectée.
  // Un événement spécial est forcément une quête — le type 'event' et sa
  // récompense doublée n'existent que là.
  const isDaily = !draft.isEvent
    && (detected === 'daily' || (!explicit && schedule.recurring) || (timed && schedule.recurring));
  draft.kind = isDaily ? 'daily' : 'quest';

  if (isDaily) {
    draft.days = schedule.days;
    if (timeLimit) {
      draft.timeLimit = timeLimit;
      draft.flags.push(`Avant ${timeLimit}`);
    }
    draft.flags.push(schedule.days.length === 0 ? 'Tous les jours' : `Jours : ${schedule.days.map((d) => ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d]).join(' ')}`);
  } else {
    // une quête n'a pas d'heure limite : l'information est conservée en clair
    // plutôt que silencieusement perdue
    const deadline = takeDeadline(c, today);
    if (deadline) {
      draft.deadline = deadline;
      draft.flags.push(`Échéance ${deadline}`);
    }
    if (timeLimit) {
      draft.description = `À faire avant ${timeLimit}.`;
      draft.flags.push(`Avant ${timeLimit}`);
      if (!deadline) {
        draft.deadline = today;
        draft.flags.push(`Échéance ${today}`);
      }
    }
    // des jours énumérés sur une quête valent échéance : « ranger samedi »
    if (!draft.deadline && schedule.days.length === 1) {
      draft.deadline = nextWeekday(today, schedule.days[0]);
      draft.flags.push(`Échéance ${draft.deadline}`);
    }
  }

  c.drop(RX_OPENING);
  const title = tidy(c.text);
  if (!title) return null;
  draft.title = title;
  draft.subquests = subquests;
  if (subquests.length > 0) draft.flags.push(`${subquests.length} étape${subquests.length > 1 ? 's' : ''}`);
  if (description) draft.description = draft.description ? `${description} ${draft.description}` : description;

  // la rubrique explicite gagne ; sinon on la devine sur le titre seul, pour ne
  // pas se faire piéger par les mots de commande
  draft.category = explicitDomain ?? detectDomain(title);
  if (draft.category) draft.flags.push(`Rubrique ${draft.category}`);

  return draft;
}

// ═══════════════ entrée publique ═══════════════

/**
 * Transforme une dictée en brouillons vérifiables. `today` est injectable pour
 * rendre les tests déterministes.
 */
export function parseVoice(transcript: string, opts: { today?: string } = {}): VoiceParseResult {
  const today = opts.today ?? todayStr();
  const drafts: VoiceDraft[] = [];
  for (const segment of splitSegments(transcript)) {
    const draft = parseSegment(segment, today);
    if (draft) drafts.push(draft);
  }
  return { transcript: transcript.trim(), drafts };
}
