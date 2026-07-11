import type { Difficulty, QuestType } from './engine';

export interface SubQuest {
  id: string;
  title: string;
  done: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description?: string;
  type: QuestType; // 'quest' | 'event' (événement spécial = double récompense)
  difficulty: Difficulty;
  category?: string; // id de rubrique (library.ts)
  deadline?: string; // YYYY-MM-DD
  subquests: SubQuest[];
  createdAt: string; // ISO
  completedAt?: string; // ISO
  xpAwarded?: number;
  goldAwarded?: number;
}

export interface Daily {
  id: string;
  title: string;
  description?: string;
  difficulty: Difficulty;
  category?: string;
  days: number[]; // jours programmés (0=dim..6=sam) ; vide = tous les jours
  timeLimit?: string; // HH:MM — tâche chronométrée : valider avant cette heure
  createdAt: string; // YYYY-MM-DD
  streak: number;
  bestStreak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  completions: string[]; // historique de dates YYYY-MM-DD (borné)
  times: Record<string, string>; // date -> HH:MM de complétion (pour l'Oracle)
  lateDates: string[]; // dates validées en retard (chronométrées)
}

export interface TimeLogEntry {
  id: string;
  label: string;
  taskId?: string; // daily ou quête liée (optionnel)
  date: string; // YYYY-MM-DD
  startedAt: string; // HH:MM
  seconds: number;
}

export interface AlarmDef {
  on: boolean;
  time: string; // HH:MM
  days: number[]; // vide = tous les jours
  melody: string; // id de mélodie ('custom' = fichier importé)
  volume: number; // 0..1
}

// ── Notes & Traces de vie ──────────────────────────────────────────────
export type NoteKind = 'note' | 'resolution' | 'accomplishment';

export interface NoteEntry {
  id: string;
  kind: NoteKind;
  text: string;
  date: string; // YYYY-MM-DD
  ts: number;
}

export type TxType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TxType;
  label: string;
  amount: number; // toujours positif ; le signe dépend de `type`
  category?: string;
  date: string; // YYYY-MM-DD
}

export interface Counters {
  quests: number;
  events: number;
  epics: number;
  dailies: number;
  subquests: number;
  punctual: number; // tâches chronométrées validées à l'heure
  late: number; // validées en retard
  perfectDays: number; // journées où toutes les quotidiennes programmées ont été faites
  generated: number; // tâches créées depuis la bibliothèque
  oracleAsks: number; // messages envoyés à l'Oracle
  totalSteps: number; // pas cumulés (capteur + manuel)
  chronoSessions: number; // sessions de chronomètre terminées
  chronoMinutes: number; // minutes chronométrées cumulées
  alarmsStopped: number; // réveils arrêtés (lève-toi et marche)
  breathingSessions: number; // séances de respiration/méditation terminées
  notesLogged: number; // notes + résolutions écrites
  accomplishments: number; // victoires consignées
  oracleCloudAsks: number; // messages traités par l'Oracle en ligne
  pomodoros: number; // sessions Pomodoro terminées (travail)
}

export interface OracleMessage {
  id: string;
  role: 'user' | 'oracle';
  text: string;
  ts: number;
}

/** Une conversation compartimentée avec l'Oracle (titre auto, historique propre). */
export interface OracleConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: OracleMessage[];
}

export interface Profile {
  name: string;
  title: string; // id de titre porté (content.ts)
  sigil: string; // id de sigil porté
  xp: number;
  gold: number;
  currentStreak: number; // jours consécutifs avec au moins une tâche accomplie
  maxStreak: number;
  lastActiveDate?: string; // YYYY-MM-DD
  combo: number;
  lastComboDate?: string;
  bestCombo: number;
  counters: Counters;
  categories: Record<string, number>; // rubrique -> nb de complétions
  flags: { earlyBird?: boolean; nightOwl?: boolean; recordBreaker?: boolean };
  unlocked: Record<string, string>; // achievementId -> date de déblocage
  ownedSigils: string[];
  ownedThemes: string[];
  ownedTitles: string[];
  ownedEffects: string[];
  theme: string;
  ambientFx: string; // effet de fond actif ('none' possible)
  burstFx: string; // effet de complétion actif
  soundOn: boolean;
  motionOn: boolean; // animations ambiantes on/off
  audio: {
    volume: number; // 0..1 — volume des effets sonores
    music: boolean; // bande sonore générative
    mood: 'ether' | 'valor' | 'focus';
    musicVolume: number; // 0..1
  };
  notify: {
    enabled: boolean;
    lead: number; // minutes d'avance pour les rappels de chronométrées (0 = désactivé)
    lastCall: boolean; // ultime rappel à l'heure limite
    briefingTime: string; // HH:MM ('' = désactivé)
    sentinelTime: string; // HH:MM ('' = désactivé)
    celebrate: boolean; // niveaux, records, journées parfaites
    intensity: 'discret' | 'normal' | 'duolingo'; // ton et fréquence des relances
  };
  voice: {
    spoken: boolean; // l'Oracle lit ses réponses à voix haute
    voiceURI: string; // '' = voix système par défaut
    rate: number; // 0.5..2
    pitch: number; // 0.5..2
  };
  steps: {
    goal: number; // objectif quotidien
    counted: Record<string, number>; // date -> pas comptés par le capteur
    manual: Record<string, number>; // date -> pas ajoutés à la main
    bestDay: number;
  };
  alarms: {
    wake: AlarmDef;
    lullaby: AlarmDef;
    customAudioName?: string; // nom du fichier importé (données dans localStorage à part)
  };
  wakeLog: Record<string, string>; // date -> HH:MM (heure d'arrêt du réveil)
  syncHost?: string; // dernière adresse de sync "ip:port" mémorisée
  oracle: { briefing: boolean; sentinel: boolean; lastBriefing?: string; lastSentinel?: string };
  llm: {
    provider: 'gemini' | 'groq';
    apiKey: string; // clé personnelle de l'utilisateur, gratuite, stockée en local uniquement
    model: string;
    tone: 'chaleureux' | 'direct' | 'motivant';
  };
  onboarding: {
    done: boolean;
    goal?: string; // objectif de discipline choisi
    rhythm?: string; // rythme de vie choisi
  };
  pomodoro: {
    workMin: number;
    breakMin: number;
    longBreakMin: number;
    longBreakEvery: number; // toutes les N sessions de travail
  };
  cloudSync: {
    enabled: boolean;
    url: string; // URL du projet Supabase de l'utilisateur
    anonKey: string; // clé publique "anon" du projet (sûre à stocker, protégée par RLS)
    autoSync: boolean;
    lastSyncAt?: number; // horodatage de la dernière sauvegarde envoyée
    lastRemoteUpdatedAt?: number; // horodatage connu de la dernière sauvegarde distante
  };
  lastPerfectDay?: string; // dernière journée parfaite comptée (YYYY-MM-DD)
  history: Record<string, number>; // YYYY-MM-DD -> XP gagné ce jour-là
}

export interface Toast {
  id: string;
  icon: string; // nom d'icône
  text: string;
  kind: 'xp' | 'gold' | 'achievement' | 'warn' | 'info' | 'unlock';
}

export interface LevelUpInfo {
  level: number;
  rankName: string;
  rankIcon: string;
  rankChanged: boolean;
  unlocks: string[]; // libellés des nouveautés débloquées à ce niveau
}

export interface FxEvent {
  id: number;
  x: number;
  y: number;
}
