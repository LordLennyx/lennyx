// Batterie du parseur de dictée (src/lib/voiceParse.ts).
// Lancée par `npm test` ; LENNYX_TEST_BUILD pointe sur les modules compilés.
const path = require('path');
const BUILD = process.env.LENNYX_TEST_BUILD;
if (!BUILD) throw new Error('LENNYX_TEST_BUILD absent — lance `npm test`.');
const { parseVoice, splitSegments } = require(path.join(BUILD, 'lib/voiceParse.js'));
const { normalizeNumbers, frenchNumber } = require(path.join(BUILD, 'lib/frenchNumbers.js'));

const TODAY = '2026-10-28'; // un mercredi

let pass = 0;
const fails = [];

function check(label, got, want) {
  const g = JSON.stringify(got);
  const wa = JSON.stringify(want);
  if (g === wa) { pass++; return true; }
  fails.push(`${label}\n     attendu : ${wa}\n     obtenu  : ${g}`);
  return false;
}

// ═══════ 1. nombres en français ═══════
const NUM = [
  ['zéro', 0], ['sept', 7], ['dix', 10], ['seize', 16], ['dix-sept', 17],
  ['dix-neuf', 19], ['vingt', 20], ['vingt et un', 21], ['vingt-quatre', 24],
  ['soixante-dix', 70], ['soixante-quinze', 75], ['soixante-dix-neuf', 79],
  ['quatre-vingts', 80], ['quatre-vingt-un', 81], ['quatre-vingt-dix', 90],
  ['quatre-vingt-dix-sept', 97], ['cent', 100], ['cent un', 101],
  ['cent quatre-vingt-dix', 190], ['deux cents', 200], ['deux cent cinquante', 250],
  ['mille', 1000], ['mille cinq cents', 1500], ['deux mille', 2000],
  ['deux mille cinq cents', 2500], ['cinq mille', 5000],
  ['cinquante mille', 50000], ['cent mille', 100000],
  ['deux cent mille', 200000], ['un million', 1000000],
  ['quatre mille vingt', 4020], ['septante-cinq', 75], ['nonante-neuf', 99],
];
for (const [txt, want] of NUM) {
  check(`nombre « ${txt} »`, frenchNumber(txt.split(/[\s-]+/)), want);
}

// normalisation dans une phrase
const NORM = [
  ['lire dix pages', 'lire 10 pages'],
  ['acheter un livre', 'acheter un livre'],                 // article préservé
  ['créer une quête', 'créer une quête'],                   // article préservé
  ['courir trente minutes', 'courir 30 minutes'],
  ['avant huit heures trente', 'avant 8 heures 30'],
  ['deux mille cinq cents francs', '2500 francs'],
  ['vingt et un jours', '21 jours'],
  ['quatre-vingt-dix pompes', '90 pompes'],
  ['dans trois jours', 'dans 3 jours'],
  ['cent un dalmatiens', '101 dalmatiens'],
];
for (const [txt, want] of NORM) check(`normalise « ${txt} »`, normalizeNumbers(txt), want);

// ═══════ 2. découpage ═══════
check('découpage : une seule commande',
  splitSegments('ranger le garage et le grenier').length, 1);
check('découpage : deux commandes via « ensuite »',
  splitSegments('crée une quête ranger le garage ensuite ajoute une note je suis fatigué').length, 2);
check('découpage : « et » + verbe de création',
  splitSegments('ajoute une quête laver la voiture et crée une quotidienne courir').length, 2);
check('découpage : ponctuation',
  splitSegments('note je suis fatigué. dépense 2000 francs de transport').length, 2);

// ═══════ 3. phrases complètes ═══════
function one(text) {
  const r = parseVoice(text, { today: TODAY });
  return r.drafts[0];
}

const CASES = [
  {
    label: 'quête simple',
    text: 'ajoute une quête ranger le garage',
    want: { kind: 'quest', title: 'Ranger le garage', difficulty: 'normal' },
  },
  {
    label: 'quête difficile + rubrique devinée',
    text: 'crée une quête difficile terminer le rapport pour le client',
    want: { kind: 'quest', title: 'Terminer le rapport pour le client', difficulty: 'hard', category: 'travail' },
  },
  {
    label: 'quête épique + échéance demain',
    text: 'nouvelle quête épique réviser les maths pour demain',
    want: { kind: 'quest', title: 'Réviser les maths', difficulty: 'epic', deadline: '2026-10-29', category: 'etudes' },
  },
  {
    label: 'quête avec échéance « après-demain »',
    text: 'ajoute une tâche appeler le dentiste après-demain',
    want: { kind: 'quest', title: 'Appeler le dentiste', deadline: '2026-10-30' },
  },
  {
    label: 'quête « dans trois jours »',
    text: 'ajoute une quête nettoyer la terrasse dans trois jours',
    want: { kind: 'quest', title: 'Nettoyer la terrasse', deadline: '2026-10-31' },
  },
  {
    label: 'quête « le 15 novembre »',
    text: 'crée une quête payer la facture le 15 novembre',
    want: { kind: 'quest', title: 'Payer la facture', deadline: '2026-11-15' },
  },
  {
    label: 'quête « vendredi » → prochaine occurrence',
    text: 'ajoute une quête laver la voiture vendredi',
    want: { kind: 'quest', title: 'Laver la voiture', deadline: '2026-10-30' },
  },
  {
    label: 'quête « la semaine prochaine »',
    text: 'ajoute une quête réparer le vélo la semaine prochaine',
    want: { kind: 'quest', title: 'Réparer le vélo', deadline: '2026-11-04' },
  },
  {
    label: 'événement spécial',
    text: 'crée un événement spécial préparer la fête de ma mère samedi',
    want: { kind: 'quest', isEvent: true, title: 'Préparer la fête de ma mère', deadline: '2026-10-31' },
  },
  {
    label: 'quête avec étapes',
    text: 'crée une quête difficile ranger le garage avec les étapes vider les cartons, balayer et jeter les ordures',
    want: { kind: 'quest', title: 'Ranger le garage', difficulty: 'hard', subquests: ['Vider les cartons', 'Balayer', 'Jeter les ordures'] },
  },
  {
    label: 'quête avec description',
    text: 'ajoute une quête mettre à jour mon CV description insister sur les projets récents',
    want: { kind: 'quest', title: 'Mettre à jour mon CV', description: 'Insister sur les projets récents' },
  },
  {
    label: 'rubrique explicite',
    text: 'ajoute une quête finir le chapitre dans la rubrique créativité',
    want: { kind: 'quest', title: 'Finir le chapitre', category: 'creativite' },
  },
  {
    label: 'quotidienne tous les jours',
    text: 'crée une quotidienne boire deux litres d\'eau tous les jours',
    want: { kind: 'daily', title: 'Boire 2 litres d\'eau', days: [] },
  },
  {
    label: 'quotidienne chronométrée en semaine',
    text: 'nouvelle quotidienne chronométrée arriver à l\'école avant sept heures trente en semaine difficile',
    want: { kind: 'daily', title: 'Arriver à l\'école', timeLimit: '07:30', days: [1, 2, 3, 4, 5], difficulty: 'hard', category: 'etudes' },
  },
  {
    label: 'quotidienne jours énumérés',
    text: 'ajoute une quotidienne courir trente minutes le lundi, mercredi et vendredi',
    want: { kind: 'daily', title: 'Courir 30 minutes', days: [1, 3, 5], category: 'sport' },
  },
  {
    label: 'quotidienne tous les jours sauf dimanche',
    text: 'crée une routine lire vingt pages tous les jours sauf le dimanche',
    want: { kind: 'daily', title: 'Lire 20 pages', days: [1, 2, 3, 4, 5, 6] },
  },
  {
    label: 'quotidienne le week-end',
    text: 'nouvelle quotidienne grand ménage le week-end',
    want: { kind: 'daily', title: 'Grand ménage', days: [0, 6], category: 'maison' },
  },
  {
    label: 'récurrence sans mot « quotidienne »',
    text: 'je dois méditer chaque matin',
    want: { kind: 'daily', title: 'Méditer', category: 'esprit' },
  },
  {
    label: 'heure « et demie »',
    text: 'quotidienne se coucher avant vingt-deux heures et demie',
    want: { kind: 'daily', title: 'Se coucher', timeLimit: '22:30', category: 'sommeil' },
  },
  {
    label: 'heure « midi »',
    text: 'quotidienne déjeuner avant midi tous les jours',
    want: { kind: 'daily', title: 'Déjeuner', timeLimit: '12:00' },
  },
  {
    label: 'heure « huit heures du soir »',
    text: 'quotidienne fermer l\'ordinateur avant huit heures du soir en semaine',
    want: { kind: 'daily', title: 'Fermer l\'ordinateur', timeLimit: '20:00', days: [1, 2, 3, 4, 5] },
  },
  {
    label: 'note libre',
    text: 'note que je me sens fatigué ce matin',
    want: { kind: 'note', title: 'Je me sens fatigué ce matin' },
  },
  {
    label: 'résolution',
    text: 'nouvelle résolution je m\'engage à ne plus repousser mes devoirs',
    want: { kind: 'resolution', title: 'Ne plus repousser mes devoirs' },
  },
  {
    label: 'victoire',
    text: 'victoire j\'ai fini mon exposé de physique',
    want: { kind: 'win', title: 'J\'ai fini mon exposé de physique' },
  },
  {
    label: 'dépense avec devise',
    text: 'j\'ai dépensé deux mille francs pour le transport',
    want: { kind: 'expense', title: 'Transport', amount: 2000, txCategory: 'Transport' },
  },
  {
    label: 'dépense sans « pour »',
    text: 'dépense cinq mille francs de nourriture',
    want: { kind: 'expense', title: 'Nourriture', amount: 5000, txCategory: 'Nourriture' },
  },
  {
    label: 'dépense décimale',
    text: 'j\'ai payé 12,50 euros au restaurant',
    want: { kind: 'expense', title: 'Restaurant', amount: 12.5, txCategory: 'Nourriture' },
  },
  {
    label: 'revenu salaire',
    text: 'j\'ai reçu cinquante mille francs de salaire',
    want: { kind: 'income', title: 'Salaire', amount: 50000, txCategory: 'Salaire' },
  },
  {
    label: 'montant avec séparateur de milliers',
    text: 'dépense 5 000 francs pour le loyer',
    want: { kind: 'expense', title: 'Loyer', amount: 5000, txCategory: 'Logement' },
  },
  {
    label: 'sans mot de commande du tout',
    text: 'ranger ma chambre',
    want: { kind: 'quest', title: 'Ranger ma chambre', category: 'maison' },
  },
  {
    label: 'rappelle-moi',
    text: 'rappelle-moi d\'appeler maman demain',
    want: { kind: 'quest', title: 'Appeler maman', deadline: '2026-10-29', category: 'social' },
  },
];

for (const { label, text, want } of CASES) {
  const d = one(text);
  if (!d) { fails.push(`${label}\n     aucun brouillon produit pour « ${text} »`); continue; }
  for (const [key, value] of Object.entries(want)) {
    check(`${label} → ${key}`, d[key], value);
  }
}

// ═══════ 4. dictée du matin : plusieurs commandes d'un coup ═══════
const MORNING =
  'crée une quotidienne chronométrée arriver à l\'école avant sept heures trente en semaine difficile. ' +
  'ensuite ajoute une quête épique réviser les mathématiques pour vendredi. ' +
  'puis note que j\'ai mal dormi cette nuit. ' +
  'et aussi j\'ai dépensé deux mille francs pour le transport';
const morning = parseVoice(MORNING, { today: TODAY });
check('dictée du matin : 4 brouillons', morning.drafts.length, 4);
check('dictée du matin : types', morning.drafts.map((d) => d.kind), ['daily', 'quest', 'note', 'expense']);
check('dictée du matin : titres', morning.drafts.map((d) => d.title),
  ['Arriver à l\'école', 'Réviser les mathématiques', 'J\'ai mal dormi cette nuit', 'Transport']);

// ═══════ verdict ═══════
console.log(`\n${pass} vérifications passées, ${fails.length} échec(s)\n`);
if (fails.length > 0) {
  for (const f of fails) console.log(' ✗ ' + f);
  process.exit(1);
}
console.log('✓ parseur de dictée conforme');
