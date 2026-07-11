// ── Catalogue de Lennyx : succès, thèmes, sigils, titres, effets ──────────
import type { Profile } from './types';

// ═══════════════════════════ SUCCÈS (60+) ════════════════════════════════

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  gold: number;
  secret?: boolean;
  check: (p: Profile, level: number) => boolean;
}

const c = (n: keyof Profile['counters'], v: number) => (p: Profile) => p.counters[n] >= v;
const lvl = (v: number) => (_p: Profile, l: number) => l >= v;

export const ACHIEVEMENTS: AchievementDef[] = [
  // — Quêtes —
  { id: 'first-quest', name: 'Premier sang', desc: 'Accomplir ta première quête', icon: 'sword', gold: 10, check: c('quests', 1) },
  { id: 'q10', name: 'Aventurier confirmé', desc: 'Accomplir 10 quêtes', icon: 'sword', gold: 25, check: c('quests', 10) },
  { id: 'q25', name: 'Bras armé', desc: 'Accomplir 25 quêtes', icon: 'blades', gold: 40, check: c('quests', 25) },
  { id: 'q50', name: 'Machine de guerre', desc: 'Accomplir 50 quêtes', icon: 'blades', gold: 75, check: c('quests', 50) },
  { id: 'q100', name: 'Centurion', desc: 'Accomplir 100 quêtes', icon: 'shield', gold: 150, check: c('quests', 100) },
  { id: 'q250', name: 'Légende vivante', desc: 'Accomplir 250 quêtes', icon: 'laurel', gold: 400, check: c('quests', 250) },
  { id: 'q500', name: 'Moisson éternelle', desc: 'Accomplir 500 quêtes', icon: 'laurel', gold: 800, check: c('quests', 500) },
  { id: 'q1000', name: 'Millénaire', desc: 'Accomplir 1 000 quêtes', icon: 'crown', gold: 2000, check: c('quests', 1000) },
  // — Quotidiennes —
  { id: 'd10', name: 'Routine du héros', desc: 'Accomplir 10 quotidiennes', icon: 'calendar', gold: 25, check: c('dailies', 10) },
  { id: 'd50', name: 'Métronome', desc: 'Accomplir 50 quotidiennes', icon: 'calendar', gold: 75, check: c('dailies', 50) },
  { id: 'd100', name: 'Discipline de fer', desc: 'Accomplir 100 quotidiennes', icon: 'shield', gold: 150, check: c('dailies', 100) },
  { id: 'd365', name: 'Une année de gloire', desc: 'Accomplir 365 quotidiennes', icon: 'star', gold: 500, check: c('dailies', 365) },
  { id: 'd1000', name: 'Rituel absolu', desc: 'Accomplir 1 000 quotidiennes', icon: 'crown', gold: 1500, check: c('dailies', 1000) },
  // — Streaks —
  { id: 'streak3', name: 'Étincelle', desc: '3 jours de streak', icon: 'flame', gold: 15, check: (p) => p.maxStreak >= 3 },
  { id: 'streak7', name: 'En feu', desc: '7 jours de streak', icon: 'flame', gold: 40, check: (p) => p.maxStreak >= 7 },
  { id: 'streak14', name: 'Brasier', desc: '14 jours de streak', icon: 'flame', gold: 80, check: (p) => p.maxStreak >= 14 },
  { id: 'streak30', name: 'Inarrêtable', desc: '30 jours de streak', icon: 'flame', gold: 200, check: (p) => p.maxStreak >= 30 },
  { id: 'streak60', name: 'Volonté d’acier', desc: '60 jours de streak', icon: 'flame', gold: 350, check: (p) => p.maxStreak >= 60 },
  { id: 'streak100', name: 'Force de la nature', desc: '100 jours de streak', icon: 'flame', gold: 600, check: (p) => p.maxStreak >= 100 },
  { id: 'streak365', name: 'Serment éternel', desc: '365 jours de streak', icon: 'laurel', gold: 2500, check: (p) => p.maxStreak >= 365 },
  // — Niveaux —
  { id: 'lvl5', name: 'Ça commence', desc: 'Atteindre le niveau 5', icon: 'seed', gold: 20, check: lvl(5) },
  { id: 'lvl10', name: 'Explorateur', desc: 'Atteindre le niveau 10', icon: 'compass', gold: 40, check: lvl(10) },
  { id: 'lvl20', name: 'Éclaireur', desc: 'Atteindre le niveau 20', icon: 'map', gold: 70, check: lvl(20) },
  { id: 'lvl25', name: 'Vétéran', desc: 'Atteindre le niveau 25', icon: 'medal', gold: 100, check: lvl(25) },
  { id: 'lvl40', name: 'Éminence grise', desc: 'Atteindre le niveau 40', icon: 'brain', gold: 180, check: lvl(40) },
  { id: 'lvl50', name: 'Élite', desc: 'Atteindre le niveau 50', icon: 'gem', gold: 250, check: lvl(50) },
  { id: 'lvl65', name: 'Titan', desc: 'Atteindre le niveau 65', icon: 'shield', gold: 320, check: lvl(65) },
  { id: 'lvl75', name: 'Mythique', desc: 'Atteindre le niveau 75', icon: 'star', gold: 400, check: lvl(75) },
  { id: 'lvl90', name: 'Panthéon', desc: 'Atteindre le niveau 90', icon: 'crown', gold: 700, check: lvl(90) },
  { id: 'lvl100', name: 'TaskMaster', desc: 'Atteindre le niveau 100', icon: 'laurel', gold: 3000, check: lvl(100) },
  // — Combos —
  { id: 'combo5', name: 'Enchaînement', desc: '5 tâches le même jour', icon: 'bolt', gold: 30, check: (p) => p.bestCombo >= 5 },
  { id: 'combo10', name: 'Déferlante', desc: '10 tâches le même jour', icon: 'bolt', gold: 80, check: (p) => p.bestCombo >= 10 },
  { id: 'combo15', name: 'Tempête parfaite', desc: '15 tâches le même jour', icon: 'bolt', gold: 160, check: (p) => p.bestCombo >= 15 },
  { id: 'combo20', name: 'Cataclysme', desc: '20 tâches le même jour', icon: 'bolt', gold: 300, check: (p) => p.bestCombo >= 20 },
  // — Ponctualité (tâches chronométrées) —
  { id: 'punct1', name: 'À l’heure', desc: 'Valider une tâche chronométrée à temps', icon: 'clock', gold: 15, check: c('punctual', 1) },
  { id: 'punct10', name: 'Horloger', desc: '10 tâches chronométrées à temps', icon: 'clock', gold: 60, check: c('punctual', 10) },
  { id: 'punct50', name: 'Maître du temps', desc: '50 tâches chronométrées à temps', icon: 'clock', gold: 200, check: c('punctual', 50) },
  { id: 'punct100', name: 'Seigneur des heures', desc: '100 tâches chronométrées à temps', icon: 'hourglass', gold: 450, check: c('punctual', 100) },
  { id: 'punct250', name: 'Chronos', desc: '250 tâches chronométrées à temps', icon: 'hourglass', gold: 900, check: c('punctual', 250) },
  // — Journées parfaites —
  { id: 'perfect1', name: 'Sans faute', desc: 'Une journée où toutes les quotidiennes sont faites', icon: 'check', gold: 25, check: c('perfectDays', 1) },
  { id: 'perfect7', name: 'Semaine immaculée', desc: '7 journées parfaites', icon: 'check', gold: 120, check: c('perfectDays', 7) },
  { id: 'perfect30', name: 'Mois de légende', desc: '30 journées parfaites', icon: 'laurel', gold: 500, check: c('perfectDays', 30) },
  { id: 'perfect100', name: 'Perfection incarnée', desc: '100 journées parfaites', icon: 'laurel', gold: 1200, check: c('perfectDays', 100) },
  // — Types & difficultés —
  { id: 'epic10', name: 'Tueur d’épiques', desc: 'Accomplir 10 quêtes épiques', icon: 'gem', gold: 100, check: c('epics', 10) },
  { id: 'epic50', name: 'Fléau des titans', desc: 'Accomplir 50 quêtes épiques', icon: 'gem', gold: 400, check: c('epics', 50) },
  { id: 'event5', name: 'Chasseur d’événements', desc: 'Accomplir 5 événements spéciaux', icon: 'star', gold: 80, check: c('events', 5) },
  { id: 'event25', name: 'Faiseur d’histoire', desc: 'Accomplir 25 événements spéciaux', icon: 'star', gold: 300, check: c('events', 25) },
  { id: 'sub25', name: 'Méthodique', desc: 'Cocher 25 sous-quêtes', icon: 'list', gold: 50, check: c('subquests', 25) },
  { id: 'sub100', name: 'Architecte', desc: 'Cocher 100 sous-quêtes', icon: 'list', gold: 180, check: c('subquests', 100) },
  // — Rubriques —
  { id: 'cat3', name: 'Touche-à-tout', desc: 'Accomplir des tâches dans 3 rubriques', icon: 'grid', gold: 40, check: (p) => Object.keys(p.categories).length >= 3 },
  { id: 'cat6', name: 'Polyvalent', desc: 'Accomplir des tâches dans 6 rubriques', icon: 'grid', gold: 100, check: (p) => Object.keys(p.categories).length >= 6 },
  { id: 'cat12', name: 'Homme-orchestre', desc: 'Accomplir des tâches dans 12 rubriques', icon: 'grid', gold: 300, check: (p) => Object.keys(p.categories).length >= 12 },
  { id: 'work50', name: 'Force de travail', desc: '50 tâches de la rubrique Travail', icon: 'briefcase', gold: 150, check: (p) => (p.categories['travail'] ?? 0) >= 50 },
  { id: 'sport50', name: 'Athlète', desc: '50 tâches de la rubrique Sport', icon: 'heart', gold: 150, check: (p) => (p.categories['sport'] ?? 0) >= 50 },
  { id: 'mind50', name: 'Esprit clair', desc: '50 tâches de la rubrique Esprit', icon: 'brain', gold: 150, check: (p) => (p.categories['esprit'] ?? 0) >= 50 },
  // — Bibliothèque & Oracle —
  { id: 'gen1', name: 'Premier grimoire', desc: 'Créer une tâche depuis la bibliothèque', icon: 'book', gold: 15, check: c('generated', 1) },
  { id: 'gen25', name: 'Bibliothécaire', desc: '25 tâches créées depuis la bibliothèque', icon: 'book', gold: 100, check: c('generated', 25) },
  { id: 'oracle1', name: 'Premier augure', desc: 'Consulter l’Oracle', icon: 'eye', gold: 15, check: c('oracleAsks', 1) },
  { id: 'oracle50', name: 'Confident de l’Oracle', desc: '50 échanges avec l’Oracle', icon: 'eye', gold: 150, check: c('oracleAsks', 50) },
  // — Horaires & divers —
  { id: 'early-bird', name: 'Lève-tôt', desc: 'Accomplir une tâche entre 4h et 8h', icon: 'sun', gold: 25, check: (p) => !!p.flags.earlyBird },
  { id: 'night-owl', name: 'Oiseau de nuit', desc: 'Accomplir une tâche entre 22h et 4h', icon: 'moon', gold: 25, check: (p) => !!p.flags.nightOwl },
  { id: 'record', name: 'Record battu', desc: 'Battre ton record de streak sur une quotidienne', icon: 'chart', gold: 30, check: (p) => !!p.flags.recordBreaker },
  // — Fortune & collection —
  { id: 'rich500', name: 'Trésorier', desc: 'Posséder 500 pièces d’or', icon: 'coin', gold: 0, check: (p) => p.gold >= 500 },
  { id: 'rich2000', name: 'Magnat', desc: 'Posséder 2 000 pièces d’or', icon: 'coin', gold: 0, check: (p) => p.gold >= 2000 },
  { id: 'rich5000', name: 'Crésus', desc: 'Posséder 5 000 pièces d’or', icon: 'coin', gold: 0, check: (p) => p.gold >= 5000 },
  { id: 'collect-themes5', name: 'Esthète', desc: 'Posséder 5 thèmes', icon: 'palette', gold: 100, check: (p) => p.ownedThemes.length >= 5 },
  { id: 'collect-themes12', name: 'Mécène', desc: 'Posséder 12 thèmes', icon: 'palette', gold: 400, check: (p) => p.ownedThemes.length >= 12 },
  { id: 'collect-sigils8', name: 'Héraldiste', desc: 'Posséder 8 sigils', icon: 'sigil-knot', gold: 150, check: (p) => p.ownedSigils.length >= 8 },
  { id: 'collect-titles5', name: 'Homme aux mille noms', desc: 'Posséder 5 titres', icon: 'quill', gold: 150, check: (p) => p.ownedTitles.length >= 5 },
  // — Podomètre —
  { id: 'steps5k', name: 'Marcheur', desc: '5 000 pas en une journée', icon: 'heart', gold: 30, check: (p) => p.steps.bestDay >= 5000 },
  { id: 'steps10k', name: 'Arpenteur', desc: '10 000 pas en une journée', icon: 'heart', gold: 80, check: (p) => p.steps.bestDay >= 10000 },
  { id: 'steps20k', name: 'Vagabond céleste', desc: '20 000 pas en une journée', icon: 'map', gold: 200, check: (p) => p.steps.bestDay >= 20000 },
  { id: 'steps100k', name: 'Pèlerin', desc: '100 000 pas cumulés', icon: 'map', gold: 150, check: c('totalSteps', 100000) },
  { id: 'steps1m', name: 'Traverseur de mondes', desc: '1 000 000 de pas cumulés', icon: 'laurel', gold: 1000, check: c('totalSteps', 1000000) },
  // — Chronomètre —
  { id: 'chrono1', name: 'Contre la montre', desc: 'Terminer une session chronométrée', icon: 'hourglass', gold: 15, check: c('chronoSessions', 1) },
  { id: 'chrono25', name: 'Maître des sabliers', desc: '25 sessions chronométrées', icon: 'hourglass', gold: 100, check: c('chronoSessions', 25) },
  { id: 'chrono100', name: 'Seigneur des instants', desc: '100 sessions chronométrées', icon: 'hourglass', gold: 300, check: c('chronoSessions', 100) },
  { id: 'chrono1000m', name: 'Mille minutes maîtrisées', desc: '1 000 minutes chronométrées', icon: 'clock', gold: 250, check: c('chronoMinutes', 1000) },
  // — Alarmes & réveils —
  { id: 'wake1', name: 'Debout, soldat', desc: 'Arrêter ton premier réveil Lennyx', icon: 'sun', gold: 15, check: c('alarmsStopped', 1) },
  { id: 'wake30', name: 'Aube conquise', desc: '30 réveils arrêtés', icon: 'sun', gold: 150, check: c('alarmsStopped', 30) },
  { id: 'wake100', name: 'Maître des matins', desc: '100 réveils arrêtés', icon: 'sun', gold: 400, check: c('alarmsStopped', 100) },
  // — Oracle & bibliothèque, suite —
  { id: 'oracle200', name: 'Âme sœur de l’Oracle', desc: '200 échanges avec l’Oracle', icon: 'eye', gold: 400, check: c('oracleAsks', 200) },
  { id: 'gen100', name: 'Seigneur du grimoire', desc: '100 tâches créées depuis la bibliothèque', icon: 'book', gold: 300, check: c('generated', 100) },
  { id: 'rich20000', name: 'Dragon sur son trésor', desc: 'Posséder 20 000 pièces d’or', icon: 'coin', gold: 0, check: (p) => p.gold >= 20000 },
  { id: 'collect-titles12', name: 'Légion de noms', desc: 'Posséder 12 titres', icon: 'quill', gold: 400, check: (p) => p.ownedTitles.length >= 12 },
  { id: 'cat18', name: 'Vie totale', desc: 'Accomplir des tâches dans les 18 rubriques', icon: 'grid', gold: 600, check: (p) => Object.keys(p.categories).length >= 18 },
  // — Notes, finances & respiration (v0.5) —
  { id: 'note1', name: 'Esprit vidé', desc: 'Écrire ta première note ou résolution', icon: 'quill', gold: 15, check: c('notesLogged', 1) },
  { id: 'note50', name: 'Chroniqueur', desc: '50 notes ou résolutions écrites', icon: 'quill', gold: 150, check: c('notesLogged', 50) },
  { id: 'win1', name: 'Petite victoire', desc: 'Consigner ton premier accomplissement', icon: 'star', gold: 15, check: c('accomplishments', 1) },
  { id: 'win30', name: 'Palmarès', desc: '30 accomplissements consignés', icon: 'star', gold: 200, check: c('accomplishments', 30) },
  { id: 'win100', name: 'Vie de conquêtes', desc: '100 accomplissements consignés', icon: 'laurel', gold: 500, check: c('accomplishments', 100) },
  { id: 'breath1', name: 'Premier souffle', desc: 'Terminer une séance de respiration', icon: 'sparkle', gold: 15, check: c('breathingSessions', 1) },
  { id: 'breath30', name: 'Esprit apaisé', desc: '30 séances de respiration', icon: 'sparkle', gold: 180, check: c('breathingSessions', 30) },
  { id: 'oraclecloud1', name: 'Premier contact céleste', desc: "Consulter l'Oracle en ligne", icon: 'eye', gold: 20, check: c('oracleCloudAsks', 1) },
  { id: 'oraclecloud100', name: 'Confident céleste', desc: "100 échanges avec l'Oracle en ligne", icon: 'eye', gold: 300, check: c('oracleCloudAsks', 100) },
];

// ═══════════════════════════ THÈMES (19) ═════════════════════════════════

export interface ThemeItem {
  id: string;
  name: string;
  price: number;
  unlockLevel?: number;
  vars: {
    bg: string; panel: string; panel2: string; border: string;
    text: string; muted: string; accent: string; accent2: string; gold: string;
  };
}

const dark = (bg: string, panel: string, panel2: string, border: string) => ({
  bg, panel, panel2, border, text: '#eae6dc', muted: '#8f8a80',
});

export const THEMES: ThemeItem[] = [
  { id: 'obsidian', name: 'Obsidienne', price: 0, vars: { ...dark('#0a0a0d', '#111116', '#18181f', '#26242c'), accent: '#c9a227', accent2: '#8b6ce0', gold: '#d4af37' } },
  { id: 'nebula', name: 'Nébuleuse', price: 0, vars: { ...dark('#0b0e14', '#121722', '#1a2030', '#242b3d'), accent: '#8b5cf6', accent2: '#22d3ee', gold: '#fbbf24' } },
  { id: 'abyss', name: 'Abysse', price: 200, vars: { ...dark('#060a12', '#0c1220', '#131b2e', '#1d283f'), accent: '#3b82f6', accent2: '#2dd4bf', gold: '#eab308' } },
  { id: 'ember', name: 'Braise', price: 200, vars: { ...dark('#0f0a08', '#171009', '#211610', '#31241a'), accent: '#f97316', accent2: '#ef4444', gold: '#f59e0b' } },
  { id: 'aurora', name: 'Aurore boréale', price: 250, vars: { ...dark('#070d0c', '#0d1514', '#12201d', '#1d312d'), accent: '#10b981', accent2: '#38bdf8', gold: '#facc15' } },
  { id: 'cyber', name: 'Cyberpunk', price: 300, vars: { ...dark('#0a0612', '#120a1c', '#1a0f29', '#2c1a42'), accent: '#e879f9', accent2: '#22d3ee', gold: '#fde047' } },
  { id: 'royal', name: 'Pourpre royal', price: 350, vars: { ...dark('#0d0812', '#150d1e', '#1e1329', '#2f2140'), accent: '#a855f7', accent2: '#d4af37', gold: '#d4af37' } },
  { id: 'blood', name: 'Sang de dragon', price: 400, vars: { ...dark('#100708', '#180b0d', '#221114', '#361b20'), accent: '#dc2626', accent2: '#f59e0b', gold: '#f59e0b' } },
  { id: 'sapphire', name: 'Saphir', price: 450, vars: { ...dark('#050810', '#0a101e', '#0f172c', '#1a2542'), accent: '#60a5fa', accent2: '#a5b4fc', gold: '#fcd34d' } },
  { id: 'jade', name: 'Jade impérial', price: 450, vars: { ...dark('#060b08', '#0b140e', '#111d15', '#1c2f22'), accent: '#34d399', accent2: '#d4af37', gold: '#d4af37' } },
  { id: 'copper', name: 'Cuivre antique', price: 500, vars: { ...dark('#0d0a07', '#15100a', '#1e1710', '#30251a'), accent: '#d97706', accent2: '#b45309', gold: '#f5c15c' } },
  { id: 'glacier', name: 'Glacier', price: 550, vars: { bg: '#070b10', panel: '#0d1319', panel2: '#131c24', border: '#1f2c38', text: '#e8f0f6', muted: '#7e93a3', accent: '#7dd3fc', accent2: '#e0f2fe', gold: '#fde68a' } },
  { id: 'bordeaux', name: 'Bordeaux', price: 600, vars: { ...dark('#0e070b', '#160b11', '#1f1018', '#331b28'), accent: '#be123c', accent2: '#e8b4b8', gold: '#e2b13c' } },
  { id: 'midnight', name: 'Minuit d’argent', price: 650, vars: { bg: '#07070d', panel: '#0e0e17', panel2: '#151522', border: '#23233a', text: '#e7e7f0', muted: '#8888a0', accent: '#c0c6d4', accent2: '#7b86e8', gold: '#d8dce6' } },
  { id: 'ivory', name: 'Ivoire', price: 800, vars: { bg: '#f4f1ea', panel: '#fdfbf6', panel2: '#efeadf', border: '#ddd5c4', text: '#25211a', muted: '#7d766a', accent: '#9a7b1e', accent2: '#5b4a9e', gold: '#b8860b' } },
  { id: 'argent', name: 'Noir & Argent', price: 900, unlockLevel: 20, vars: { bg: '#060606', panel: '#0e0e0e', panel2: '#161616', border: '#2a2a2a', text: '#f2f2f2', muted: '#8a8a8a', accent: '#d9d9d9', accent2: '#9aa0a6', gold: '#e8e8e8' } },
  { id: 'solar', name: 'Couronne solaire', price: 1000, unlockLevel: 30, vars: { ...dark('#0c0903', '#151006', '#1e170a', '#332813'), accent: '#fbbf24', accent2: '#fff7d6', gold: '#ffd700' } },
  { id: 'vantablack', name: 'Vantablack', price: 1500, unlockLevel: 40, vars: { bg: '#000000', panel: '#080808', panel2: '#0f0f0f', border: '#1f1f1f', text: '#efece4', muted: '#6f6c66', accent: '#c9a227', accent2: '#efece4', gold: '#c9a227' } },
  { id: 'prism', name: 'Prisme', price: 2500, unlockLevel: 50, vars: { ...dark('#08080e', '#101018', '#171724', '#252538'), accent: '#a78bfa', accent2: '#22d3ee', gold: '#f0c33c' } },
  { id: 'rosenoir', name: 'Rose noire', price: 4000, unlockLevel: 55, vars: { ...dark('#0c070a', '#140b10', '#1d1017', '#301a26'), accent: '#f472b6', accent2: '#9d7bd8', gold: '#e8c06a' } },
  { id: 'empyree', name: 'Empyrée', price: 8000, unlockLevel: 65, vars: { bg: '#060810', panel: '#0c1020', panel2: '#121830', border: '#20294a', text: '#f0ecf9', muted: '#8d92b3', accent: '#f4dd8c', accent2: '#8fb8ff', gold: '#ffd700' } },
  { id: 'eclipse', name: 'Éclipse totale', price: 15000, unlockLevel: 75, vars: { bg: '#020203', panel: '#0a0a0c', panel2: '#111114', border: '#222228', text: '#f5f2ea', muted: '#77736b', accent: '#ff8c42', accent2: '#c9a227', gold: '#ffb347' } },
  // ── L'article ultime du catalogue : réservé aux fortunes de légende ──
  { id: 'trone', name: 'Trône Céleste', price: 250000, unlockLevel: 100, vars: { bg: '#0a0805', panel: '#141008', panel2: '#1e180c', border: '#3d3114', text: '#fdf6e3', muted: '#a89868', accent: '#ffd700', accent2: '#fff7d6', gold: '#ffe066' } },
];

// ═══════════════════════════ SIGILS (18) ═════════════════════════════════
// Emblèmes héraldiques SVG (rendus par le composant Sigil).

export interface SigilItem {
  id: string;
  name: string;
  price: number;
  unlockLevel?: number;
}

export const SIGILS: SigilItem[] = [
  { id: 'sigil-moon', name: 'Croissant', price: 0 },
  { id: 'sigil-blade', name: 'Lame', price: 0 },
  { id: 'sigil-star', name: 'Étoile polaire', price: 0 },
  { id: 'sigil-knot', name: 'Nœud celtique', price: 60 },
  { id: 'sigil-tri', name: 'Triquetra', price: 80 },
  { id: 'sigil-eye', name: 'Œil de l’Oracle', price: 120 },
  { id: 'sigil-hex', name: 'Sceau hexagonal', price: 150 },
  { id: 'sigil-spiral', name: 'Spirale d’or', price: 180 },
  { id: 'sigil-tower', name: 'Tour de guet', price: 220 },
  { id: 'sigil-wing', name: 'Aile déployée', price: 280 },
  { id: 'sigil-serpent', name: 'Ouroboros', price: 350 },
  { id: 'sigil-rose', name: 'Rose des vents', price: 420 },
  { id: 'sigil-flame', name: 'Flamme sacrée', price: 500, unlockLevel: 15 },
  { id: 'sigil-crown', name: 'Couronne', price: 650, unlockLevel: 25 },
  { id: 'sigil-dragon', name: 'Écaille de dragon', price: 900, unlockLevel: 35 },
  { id: 'sigil-phoenix', name: 'Phénix', price: 1200, unlockLevel: 45 },
  { id: 'sigil-infinity', name: 'Infini', price: 1600, unlockLevel: 60 },
  { id: 'sigil-master', name: 'Sceau du Maître', price: 2500, unlockLevel: 80 },
  { id: 'sigil-heart', name: 'Cœur ardent', price: 3500, unlockLevel: 40 },
  { id: 'sigil-comet', name: 'Comète', price: 5000, unlockLevel: 55 },
  { id: 'sigil-gate', name: 'Porte des mondes', price: 12000, unlockLevel: 70 },
  { id: 'sigil-cosmos', name: 'Cosmos', price: 30000, unlockLevel: 90 },
];

// ═══════════════════════════ TITRES (26) ═════════════════════════════════

export interface TitleItem {
  id: string;
  label: string; // affiché sous le nom
  price: number;
  unlockLevel?: number;
}

export const TITLES: TitleItem[] = [
  { id: 'none', label: '—', price: 0 },
  { id: 'novice', label: 'le Novice', price: 0 },
  { id: 'disciple', label: 'le Disciple', price: 50 },
  { id: 'assidu', label: 'l’Assidu', price: 100 },
  { id: 'matinal', label: 'le Matinal', price: 120 },
  { id: 'noctambule', label: 'le Noctambule', price: 120 },
  { id: 'strategist', label: 'le Stratège', price: 180 },
  { id: 'perfectionniste', label: 'le Perfectionniste', price: 250 },
  { id: 'infatigable', label: 'l’Infatigable', price: 300 },
  { id: 'chasseur', label: 'Chasseur de Records', price: 350 },
  { id: 'erudit', label: 'l’Érudit', price: 400 },
  { id: 'forgeron', label: 'Forgeron d’Habitudes', price: 450 },
  { id: 'sentinelle', label: 'la Sentinelle', price: 500 },
  { id: 'implacable', label: 'l’Implacable', price: 600, unlockLevel: 15 },
  { id: 'seigneur-temps', label: 'Seigneur du Temps', price: 700, unlockLevel: 20 },
  { id: 'architecte', label: 'Architecte de l’Aube', price: 800, unlockLevel: 25 },
  { id: 'gardien', label: 'Gardien du Serment', price: 900, unlockLevel: 30 },
  { id: 'eminence', label: 'l’Éminence', price: 1000, unlockLevel: 35 },
  { id: 'visionnaire', label: 'le Visionnaire', price: 1200, unlockLevel: 40 },
  { id: 'conquerant', label: 'le Conquérant', price: 1400, unlockLevel: 50 },
  { id: 'monarque', label: 'le Monarque', price: 1800, unlockLevel: 60 },
  { id: 'legende', label: 'la Légende', price: 2200, unlockLevel: 70 },
  { id: 'immortel', label: 'l’Immortel', price: 2600, unlockLevel: 80 },
  { id: 'demiurge', label: 'le Démiurge', price: 3000, unlockLevel: 90 },
  { id: 'eternel', label: 'l’Éternel', price: 4000, unlockLevel: 100 },
  { id: 'taskmaster', label: 'TaskMaster', price: 5000, unlockLevel: 100 },
  { id: 'ponctuel', label: 'le Ponctuel', price: 350 },
  { id: 'marcheur', label: 'Marcheur Infatigable', price: 600 },
  { id: 'chronomaitre', label: 'Maître du Chrono', price: 700 },
  { id: 'aube', label: 'Gardien de l’Aube', price: 900, unlockLevel: 20 },
  { id: 'coeur-vaillant', label: 'au Cœur Vaillant', price: 1100, unlockLevel: 25 },
  { id: 'oracle-incarne', label: 'l’Oracle Incarné', price: 2500, unlockLevel: 50 },
  { id: 'mythe', label: 'le Mythe Vivant', price: 8000, unlockLevel: 75 },
  // ── L'avant-dernier article : un nom que peu porteront ──
  { id: 'souverain', label: 'Souverain de Lennyx', price: 100000, unlockLevel: 95 },
];

// ═══════════════════════════ EFFETS ══════════════════════════════════════
// kind 'ambient' : fond animé permanent. kind 'burst' : explosion à la complétion.
// Certains s'achètent, d'autres se débloquent par niveau (price 0 + unlockLevel).

export interface EffectItem {
  id: string;
  name: string;
  desc: string;
  kind: 'ambient' | 'burst';
  price: number;
  unlockLevel?: number;
}

export const EFFECTS: EffectItem[] = [
  { id: 'none', name: 'Aucun', desc: 'Sobriété absolue', kind: 'ambient', price: 0 },
  { id: 'dust', name: 'Poussière d’étoiles', desc: 'Particules dérivant lentement', kind: 'ambient', price: 0 },
  { id: 'stars', name: 'Ciel étoilé', desc: 'Constellation scintillante', kind: 'ambient', price: 0, unlockLevel: 8 },
  { id: 'embers', name: 'Braises montantes', desc: 'Escarbilles incandescentes', kind: 'ambient', price: 400 },
  { id: 'aurora', name: 'Voile d’aurore', desc: 'Nappes de lumière mouvantes', kind: 'ambient', price: 0, unlockLevel: 18 },
  { id: 'matrix', name: 'Pluie de code', desc: 'Pour l’informaticien qui sommeille', kind: 'ambient', price: 600 },
  { id: 'void', name: 'Ondes du néant', desc: 'Cercles concentriques hypnotiques', kind: 'ambient', price: 0, unlockLevel: 35 },
  { id: 'burst-sparks', name: 'Étincelles', desc: 'Gerbe d’étincelles à chaque tâche', kind: 'burst', price: 0, unlockLevel: 3 },
  { id: 'burst-gold', name: 'Pluie d’or', desc: 'Éclat de pièces dorées', kind: 'burst', price: 300 },
  { id: 'burst-glyphs', name: 'Glyphes arcaniques', desc: 'Runes qui s’évanouissent', kind: 'burst', price: 500 },
  { id: 'burst-shards', name: 'Éclats de cristal', desc: 'Fragments prismatiques', kind: 'burst', price: 0, unlockLevel: 25 },
  { id: 'burst-nova', name: 'Supernova', desc: 'Onde de choc éblouissante', kind: 'burst', price: 1200, unlockLevel: 40 },
];

/** Récapitulatif des déblocages par niveau (affiché au level-up). */
export function unlocksAtLevel(level: number): string[] {
  const out: string[] = [];
  for (const t of THEMES) if (t.unlockLevel === level) out.push(`Thème « ${t.name} » disponible`);
  for (const s of SIGILS) if (s.unlockLevel === level) out.push(`Sigil « ${s.name} » disponible`);
  for (const t of TITLES) if (t.unlockLevel === level) out.push(`Titre « ${t.label} » disponible`);
  for (const e of EFFECTS) {
    if (e.unlockLevel === level) out.push(e.price === 0 ? `Effet « ${e.name} » débloqué` : `Effet « ${e.name} » disponible`);
  }
  return out;
}

export function titleLabel(id: string): string {
  const t = TITLES.find((x) => x.id === id);
  return t && t.id !== 'none' ? t.label : '';
}
