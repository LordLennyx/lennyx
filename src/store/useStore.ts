import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Quest, Daily, Profile, Toast, LevelUpInfo, SubQuest, OracleMessage, FxEvent, Counters,
  TimeLogEntry, AlarmDef, NoteEntry, NoteKind, Transaction, TxType,
} from '../game/types';
import {
  DIFFICULTIES, MISS_PENALTY, RECORD_BONUS, PUNCTUAL_BONUS, LATE_FACTOR,
  addDays, comboMultiplier, isOnTime, isScheduledOn, previousScheduledDate,
  questBaseXp, questGold, scaledXp, streakMultiplier, todayStr, uid,
  type Difficulty, type QuestType,
} from '../game/engine';
import { levelFromXp } from '../game/xp';
import { ACHIEVEMENTS, EFFECTS, SIGILS, THEMES, TITLES, unlocksAtLevel } from '../game/content';
import {
  answer, briefing, dailiesAtRisk, suggestTemplates, tplRubriqueId,
  type OracleAction, type OracleContext,
} from '../game/oracle';
import { askCloudOracle, OracleOfflineError } from '../lib/llmOracle';
import type { TaskTemplate } from '../game/library';
import { playSound } from '../lib/sound';
import { notifyNow } from '../lib/notify';

interface LennyxState {
  profile: Profile;
  quests: Quest[];
  dailies: Daily[];
  oracleMessages: OracleMessage[];
  timeLog: TimeLogEntry[];
  notes: NoteEntry[];
  transactions: Transaction[];
  lastReconcile: string;
  // éphémère (non persisté)
  toasts: Toast[];
  levelUp: LevelUpInfo | null;
  fxEvent: FxEvent | null;
  oracleThinking: boolean;

  reconcile: () => void;
  fireFx: (x: number, y: number) => void;
  addQuest: (q: {
    title: string; description?: string; type: QuestType; difficulty: Difficulty;
    category?: string; deadline?: string; subquests: string[];
  }) => void;
  deleteQuest: (id: string) => void;
  toggleSubquest: (questId: string, subId: string) => void;
  completeQuest: (id: string, at?: { x: number; y: number }) => void;
  addDaily: (d: {
    title: string; description?: string; difficulty: Difficulty;
    category?: string; days: number[]; timeLimit?: string;
  }) => void;
  deleteDaily: (id: string) => void;
  completeDaily: (id: string, at?: { x: number; y: number }) => void;
  addFromTemplate: (categoryId: string, tpl: TaskTemplate) => void;
  oracleSend: (text: string) => Promise<void>;
  oracleClear: () => void;
  setOracleOption: (key: 'briefing' | 'sentinel', value: boolean) => void;
  buyTheme: (id: string) => void;
  buySigil: (id: string) => void;
  buyTitle: (id: string) => void;
  buyEffect: (id: string) => void;
  setTheme: (id: string) => void;
  setSigil: (id: string) => void;
  setTitle: (id: string) => void;
  setAmbient: (id: string) => void;
  setBurst: (id: string) => void;
  setName: (name: string) => void;
  toggleSound: () => void;
  toggleMotion: () => void;
  setAudio: (patch: Partial<Profile['audio']>) => void;
  setNotify: (patch: Partial<Profile['notify']>) => void;
  setVoice: (patch: Partial<Profile['voice']>) => void;
  setSyncHost: (host: string) => void;
  addSteps: (n: number) => void;
  addManualSteps: (n: number) => void;
  setStepsGoal: (n: number) => void;
  logTime: (label: string, seconds: number, taskId?: string) => void;
  deleteTimeLog: (id: string) => void;
  setAlarm: (kind: 'wake' | 'lullaby', patch: Partial<AlarmDef>) => void;
  setCustomAudioName: (name?: string) => void;
  recordWake: () => void;
  addNote: (kind: NoteKind, text: string) => void;
  deleteNote: (id: string) => void;
  addTransaction: (t: { type: TxType; label: string; amount: number; category?: string; date?: string }) => void;
  deleteTransaction: (id: string) => void;
  setLLM: (patch: Partial<Profile['llm']>) => void;
  completeOnboarding: (data: { goal?: string; rhythm?: string; tone?: Profile['llm']['tone'] }) => void;
  logBreathing: (seconds: number) => void;
  pushToast: (icon: string, text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;
  clearLevelUp: () => void;
  resetAll: () => void;
  importSave: (json: string) => boolean;
}

const defaultCounters = (): Counters => ({
  quests: 0, events: 0, epics: 0, dailies: 0, subquests: 0,
  punctual: 0, late: 0, perfectDays: 0, generated: 0, oracleAsks: 0,
  totalSteps: 0, chronoSessions: 0, chronoMinutes: 0, alarmsStopped: 0,
  breathingSessions: 0, notesLogged: 0, accomplishments: 0, oracleCloudAsks: 0,
});

const defaultProfile = (): Profile => ({
  name: 'Aventurier',
  title: 'none',
  sigil: 'sigil-moon',
  xp: 0,
  gold: 0,
  currentStreak: 0,
  maxStreak: 0,
  combo: 0,
  bestCombo: 0,
  counters: defaultCounters(),
  categories: {},
  flags: {},
  unlocked: {},
  ownedSigils: ['sigil-moon', 'sigil-blade', 'sigil-star'],
  ownedThemes: ['obsidian', 'nebula'],
  ownedTitles: ['none', 'novice'],
  ownedEffects: [],
  theme: 'obsidian',
  ambientFx: 'dust',
  burstFx: 'burst-sparks',
  soundOn: true,
  motionOn: true,
  audio: { volume: 0.7, music: true, mood: 'ether', musicVolume: 0.3 },
  notify: {
    enabled: true, lead: 15, lastCall: true, briefingTime: '08:30',
    sentinelTime: '19:00', celebrate: true, intensity: 'normal',
  },
  voice: { spoken: false, voiceURI: '', rate: 1, pitch: 1 },
  steps: { goal: 8000, counted: {}, manual: {}, bestDay: 0 },
  alarms: {
    wake: { on: false, time: '07:00', days: [], melody: 'aube', volume: 0.8 },
    lullaby: { on: false, time: '22:30', days: [], melody: 'lune', volume: 0.4 },
  },
  wakeLog: {},
  oracle: { briefing: true, sentinel: true },
  llm: { provider: 'gemini', apiKey: '', model: 'gemini-2.0-flash', tone: 'chaleureux' },
  onboarding: { done: false },
  history: {},
});

/** Pas du jour (capteur + manuel). */
export function stepsOn(p: Profile, date: string): number {
  return (p.steps.counted[date] ?? 0) + (p.steps.manual[date] ?? 0);
}

/** Un effet est-il utilisable ? (gratuit niveau atteint, ou acheté) */
export function effectAvailable(p: Profile, level: number, id: string): boolean {
  const e = EFFECTS.find((x) => x.id === id);
  if (!e) return false;
  if (e.price === 0) return (e.unlockLevel ?? 0) <= level;
  return p.ownedEffects.includes(id);
}

const MAX_TOASTS = 4;
let fxSeq = 1;

const oracleCtx = (s: {
  profile: Profile; quests: Quest[]; dailies: Daily[]; timeLog: TimeLogEntry[];
  notes: NoteEntry[]; transactions: Transaction[];
}): OracleContext => ({
  profile: s.profile,
  quests: s.quests,
  dailies: s.dailies,
  timeLog: s.timeLog,
  notes: s.notes,
  transactions: s.transactions,
});

export const useStore = create<LennyxState>()(
  persist(
    (set, get) => {
      // ── helpers internes ─────────────────────────────────────────────

      const pushToast = (icon: string, text: string, kind: Toast['kind'] = 'info') => {
        const toast: Toast = { id: uid(), icon, text, kind };
        set((s) => ({ toasts: [...s.toasts, toast].slice(-MAX_TOASTS) }));
      };

      const oracleSay = (text: string) => {
        const msg: OracleMessage = { id: uid(), role: 'oracle', text, ts: Date.now() };
        set((s) => ({ oracleMessages: [...s.oracleMessages, msg].slice(-80) }));
      };

      /** Ajoute de l'XP (peut être négatif), détecte les level-up + déblocages. */
      const grantXp = (p: Profile, amount: number): Profile => {
        const before = levelFromXp(p.xp);
        const xp = Math.max(0, p.xp + amount);
        const after = levelFromXp(xp);
        const t = todayStr();
        const history = { ...p.history, [t]: (p.history[t] ?? 0) + Math.max(0, amount) };
        if (after.level > before.level) {
          const unlocks: string[] = [];
          for (let l = before.level + 1; l <= after.level; l++) unlocks.push(...unlocksAtLevel(l));
          playSound('levelup', p.soundOn);
          if (p.notify.enabled && p.notify.celebrate) {
            notifyNow(
              'celebrate',
              `Niveau ${after.level} atteint`,
              after.rank.name !== before.rank.name
                ? `Nouveau rang : ${after.rank.name}. La légende grandit.`
                : `Rang ${after.rank.name} — continue l'ascension.`,
              false,
            );
          }
          set({
            levelUp: {
              level: after.level,
              rankName: after.rank.name,
              rankIcon: after.rank.icon,
              rankChanged: after.rank.name !== before.rank.name,
              unlocks,
            },
          });
        }
        return { ...p, xp, history };
      };

      /** Enregistre une activité aujourd'hui : combo + streak global + flags horaires. */
      const registerActivity = (p: Profile): Profile => {
        const t = todayStr();
        const combo = p.lastComboDate === t ? p.combo + 1 : 1;
        let { currentStreak, maxStreak, lastActiveDate } = p;
        if (lastActiveDate !== t) {
          currentStreak = lastActiveDate === addDays(t, -1) ? currentStreak + 1 : 1;
          maxStreak = Math.max(maxStreak, currentStreak);
          lastActiveDate = t;
        }
        const hour = new Date().getHours();
        const flags = { ...p.flags };
        if (hour >= 4 && hour < 8) flags.earlyBird = true;
        if (hour >= 22 || hour < 4) flags.nightOwl = true;
        return {
          ...p, combo, lastComboDate: t,
          bestCombo: Math.max(p.bestCombo, combo),
          currentStreak, maxStreak, lastActiveDate, flags,
        };
      };

      const bumpCategory = (p: Profile, category?: string): Profile => {
        if (!category) return p;
        return { ...p, categories: { ...p.categories, [category]: (p.categories[category] ?? 0) + 1 } };
      };

      /** Vérifie les succès et crédite l'or associé. */
      const checkAchievements = (p: Profile): Profile => {
        const level = levelFromXp(p.xp).level;
        let gold = p.gold;
        const unlocked = { ...p.unlocked };
        let any = false;
        for (const a of ACHIEVEMENTS) {
          if (!unlocked[a.id] && a.check({ ...p, gold, unlocked }, level)) {
            unlocked[a.id] = todayStr();
            gold += a.gold;
            any = true;
            pushToast(a.icon, `Succès : ${a.name}${a.gold > 0 ? ` (+${a.gold} or)` : ''}`, 'achievement');
          }
        }
        if (any) playSound('achievement', p.soundOn);
        return { ...p, gold, unlocked };
      };

      /** Journée parfaite : toutes les quotidiennes programmées du jour sont faites. */
      const checkPerfectDay = (p: Profile, dailies: Daily[]): Profile => {
        const t = todayStr();
        if (p.lastPerfectDay === t) return p;
        const due = dailies.filter((d) => isScheduledOn(d.days, t));
        if (due.length === 0 || !due.every((d) => d.lastCompletedDate === t)) return p;
        pushToast('check', 'Journée parfaite : toutes tes quotidiennes sont faites', 'achievement');
        playSound('perfect', p.soundOn);
        if (p.notify.enabled && p.notify.celebrate) {
          notifyNow('celebrate', 'Journée parfaite', `${due.length} quotidienne(s) sur ${due.length} — sans faute.`, false);
        }
        return {
          ...p,
          lastPerfectDay: t,
          counters: { ...p.counters, perfectDays: p.counters.perfectDays + 1 },
        };
      };

      const fire = (at?: { x: number; y: number }) => {
        if (!at) return;
        set({ fxEvent: { id: fxSeq++, x: at.x, y: at.y } });
      };

      const makeDaily = (d: {
        title: string; description?: string; difficulty: Difficulty;
        category?: string; days?: number[]; timeLimit?: string;
      }): Daily => ({
        id: uid(),
        title: d.title,
        description: d.description,
        difficulty: d.difficulty,
        category: d.category,
        days: d.days ?? [],
        timeLimit: d.timeLimit,
        createdAt: todayStr(),
        streak: 0,
        bestStreak: 0,
        completions: [],
        times: {},
        lateDates: [],
      });

      const makeQuest = (q: {
        title: string; description?: string; type?: QuestType; difficulty: Difficulty;
        category?: string; deadline?: string; subquests?: string[];
      }): Quest => ({
        id: uid(),
        title: q.title,
        description: q.description,
        type: q.type ?? 'quest',
        difficulty: q.difficulty,
        category: q.category,
        deadline: q.deadline || undefined,
        subquests: (q.subquests ?? [])
          .filter((t) => t.trim())
          .map((t): SubQuest => ({ id: uid(), title: t.trim(), done: false })),
        createdAt: new Date().toISOString(),
      });

      const applyOracleActions = (actions: OracleAction[]) => {
        for (const a of actions) {
          if (a.kind === 'add-quest' && a.payload?.title) {
            const p = a.payload;
            set((s) => ({
              quests: [
                makeQuest({
                  title: p.title!,
                  difficulty: p.difficulty ?? 'normal',
                  type: p.isEvent ? 'event' : 'quest',
                }),
                ...s.quests,
              ],
            }));
          } else if (a.kind === 'add-daily' && a.payload?.title) {
            const p = a.payload;
            set((s) => ({
              dailies: [
                makeDaily({
                  title: p.title!,
                  difficulty: p.difficulty ?? 'normal',
                  days: p.days,
                  timeLimit: p.timeLimit,
                }),
                ...s.dailies,
              ],
            }));
          } else if (a.kind === 'generate-day') {
            const s = get();
            const ctx = oracleCtx(s);
            const rubs = a.payload?.rubriques;
            const sugg = suggestTemplates(ctx, rubs ? Math.min(6, 2 + rubs.length * 2) : 4, rubs);
            const newDailies: Daily[] = [];
            const newQuests: Quest[] = [];
            for (const tpl of sugg) {
              const rub = tplRubriqueId(tpl);
              if (tpl.kind === 'quest') {
                newQuests.push(makeQuest({ title: tpl.title, description: tpl.desc, difficulty: tpl.difficulty, category: rub }));
              } else {
                newDailies.push(
                  makeDaily({
                    title: tpl.title, description: tpl.desc, difficulty: tpl.difficulty,
                    category: rub, days: tpl.days, timeLimit: tpl.before,
                  }),
                );
              }
            }
            set((st) => ({
              dailies: [...newDailies, ...st.dailies],
              quests: [...newQuests, ...st.quests],
              profile: {
                ...st.profile,
                counters: {
                  ...st.profile.counters,
                  generated: st.profile.counters.generated + newDailies.length + newQuests.length,
                },
              },
            }));
          }
        }
      };

      return {
        profile: defaultProfile(),
        quests: [],
        dailies: [],
        oracleMessages: [],
        timeLog: [],
        notes: [],
        transactions: [],
        lastReconcile: todayStr(),
        toasts: [],
        levelUp: null,
        fxEvent: null,
        oracleThinking: false,

        pushToast,
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        clearLevelUp: () => set({ levelUp: null }),
        fireFx: (x, y) => fire({ x, y }),

        // ── Rattrapage à l'ouverture ─────────────────────────────────────
        reconcile: () => {
          const s = get();
          const t = todayStr();
          const yesterday = addDays(t, -1);
          let profile = { ...s.profile };
          if (profile.lastComboDate !== t) profile.combo = 0;
          if (profile.lastActiveDate && profile.lastActiveDate < yesterday && profile.currentStreak > 0) {
            profile.currentStreak = 0;
            pushToast('flame', 'Ton streak global est retombé à zéro…', 'warn');
          }
          let start = s.lastReconcile;
          if (addDays(start, 60) < yesterday) start = addDays(yesterday, -60);
          let penalty = 0;
          let missed = 0;
          const dailies = s.dailies.map((d) => {
            let broken = false;
            for (let day = start; day <= yesterday; day = addDays(day, 1)) {
              if (day < d.createdAt) continue;
              if (isScheduledOn(d.days, day) && !d.completions.includes(day)) {
                missed++;
                broken = true;
                penalty += Math.round(DIFFICULTIES[d.difficulty].dailyXp * MISS_PENALTY);
              }
            }
            return broken ? { ...d, streak: 0 } : d;
          });
          if (missed > 0) {
            profile = grantXp(profile, -penalty);
            playSound('fail', profile.soundOn);
            pushToast('warning', `${missed} quotidienne(s) manquée(s) : -${penalty} XP`, 'warn');
          }
          set({ profile, dailies, lastReconcile: t });

          // Briefing quotidien de l'Oracle
          const st = get();
          if (st.profile.oracle.briefing && st.profile.oracle.lastBriefing !== t) {
            oracleSay(briefing(oracleCtx(st)));
            set((x) => ({ profile: { ...x.profile, oracle: { ...x.profile.oracle, lastBriefing: t } } }));
          }
          // Sentinelle du soir : streaks en danger
          const hour = new Date().getHours();
          if (st.profile.oracle.sentinel && hour >= 18 && st.profile.oracle.lastSentinel !== t) {
            const risk = dailiesAtRisk(oracleCtx(st));
            if (risk.length > 0) {
              pushToast('eye', `L'Oracle veille : ${risk.length} quotidienne(s) encore en attente ce soir`, 'warn');
              set((x) => ({ profile: { ...x.profile, oracle: { ...x.profile.oracle, lastSentinel: t } } }));
            }
          }
        },

        // ── Quêtes ───────────────────────────────────────────────────────
        addQuest: (q) => set((s) => ({ quests: [makeQuest(q), ...s.quests] })),
        deleteQuest: (id) => set((s) => ({ quests: s.quests.filter((q) => q.id !== id) })),

        toggleSubquest: (questId, subId) => {
          const s = get();
          const quest = s.quests.find((q) => q.id === questId);
          if (!quest || quest.completedAt) return;
          const sub = quest.subquests.find((x) => x.id === subId);
          if (!sub) return;
          const nowDone = !sub.done;
          let profile = s.profile;
          if (nowDone) {
            const level = levelFromXp(profile.xp).level;
            const xp = scaledXp(5, level);
            profile = grantXp(profile, xp);
            profile = { ...profile, counters: { ...profile.counters, subquests: profile.counters.subquests + 1 } };
            playSound('complete', profile.soundOn);
            pushToast('check', `Étape accomplie : +${xp} XP`, 'xp');
            profile = checkAchievements(profile);
          }
          set({
            profile,
            quests: s.quests.map((q) =>
              q.id === questId
                ? { ...q, subquests: q.subquests.map((x) => (x.id === subId ? { ...x, done: nowDone } : x)) }
                : q,
            ),
          });
        },

        completeQuest: (id, at) => {
          const s = get();
          const quest = s.quests.find((q) => q.id === id);
          if (!quest || quest.completedAt) return;
          let profile = registerActivity(s.profile);
          const level = levelFromXp(profile.xp).level;
          const base = questBaseXp(quest.difficulty, quest.type);
          const xp = Math.round(scaledXp(base, level) * comboMultiplier(profile.combo));
          const gold = questGold(quest.difficulty, quest.type);
          profile = grantXp(profile, xp);
          profile = bumpCategory(profile, quest.category);
          profile = {
            ...profile,
            gold: profile.gold + gold,
            counters: {
              ...profile.counters,
              quests: profile.counters.quests + 1,
              events: profile.counters.events + (quest.type === 'event' ? 1 : 0),
              epics: profile.counters.epics + (quest.difficulty === 'epic' ? 1 : 0),
            },
          };
          playSound('complete', profile.soundOn);
          fire(at);
          const comboTxt = profile.combo > 1 ? ` · combo ×${profile.combo}` : '';
          pushToast(quest.type === 'event' ? 'star' : 'sword', `+${xp} XP · +${gold} or${comboTxt}`, 'xp');
          profile = checkAchievements(profile);
          set({
            profile,
            quests: s.quests.map((q) =>
              q.id === id
                ? {
                    ...q,
                    completedAt: new Date().toISOString(),
                    xpAwarded: xp,
                    goldAwarded: gold,
                    subquests: q.subquests.map((x) => ({ ...x, done: true })),
                  }
                : q,
            ),
          });
        },

        // ── Quotidiennes ─────────────────────────────────────────────────
        addDaily: (d) => set((s) => ({ dailies: [makeDaily(d), ...s.dailies] })),
        deleteDaily: (id) => set((s) => ({ dailies: s.dailies.filter((d) => d.id !== id) })),

        completeDaily: (id, at) => {
          const s = get();
          const t = todayStr();
          const daily = s.dailies.find((d) => d.id === id);
          if (!daily || daily.lastCompletedDate === t) return;
          let profile = registerActivity(s.profile);
          const onTime = !daily.timeLimit || isOnTime(daily.timeLimit);
          const prev = previousScheduledDate(daily.days, t);
          // en retard sur une chronométrée : récompense réduite, streak brisé
          const streak = onTime ? (daily.lastCompletedDate === prev ? daily.streak + 1 : 1) : 0;
          const isRecord = onTime && streak > daily.bestStreak && daily.bestStreak > 0;
          const level = levelFromXp(profile.xp).level;
          const base = DIFFICULTIES[daily.difficulty].dailyXp;
          let xp = scaledXp(base, level) * streakMultiplier(Math.max(streak, 1)) * comboMultiplier(profile.combo);
          if (daily.timeLimit && onTime) xp *= 1 + PUNCTUAL_BONUS;
          if (!onTime) xp *= LATE_FACTOR;
          if (isRecord) xp *= 1 + RECORD_BONUS;
          xp = Math.round(xp);
          const gold = Math.max(2, Math.round((DIFFICULTIES[daily.difficulty].gold / 2) * (onTime ? 1 : 0.5)));
          profile = grantXp(profile, xp);
          profile = bumpCategory(profile, daily.category);
          profile = {
            ...profile,
            gold: profile.gold + gold,
            counters: {
              ...profile.counters,
              dailies: profile.counters.dailies + 1,
              punctual: profile.counters.punctual + (daily.timeLimit && onTime ? 1 : 0),
              late: profile.counters.late + (daily.timeLimit && !onTime ? 1 : 0),
            },
            flags: isRecord ? { ...profile.flags, recordBreaker: true } : profile.flags,
          };
          playSound(!onTime ? 'fail' : isRecord ? 'record' : 'complete', profile.soundOn);
          if (onTime) fire(at);
          pushToast(
            !onTime ? 'clock' : isRecord ? 'chart' : 'flame',
            !onTime
              ? `Validée en retard : +${xp} XP (récompense réduite, streak brisé)`
              : isRecord
                ? `RECORD ! Streak ×${streak} · +${xp} XP · +${gold} or`
                : `+${xp} XP · +${gold} or · streak ×${streak}${daily.timeLimit ? ' · à l’heure' : ''}`,
            !onTime ? 'warn' : 'xp',
          );
          const nowHM = new Date().toTimeString().slice(0, 5);
          const dailies = s.dailies.map((d) =>
            d.id === id
              ? {
                  ...d,
                  streak,
                  bestStreak: Math.max(d.bestStreak, streak),
                  lastCompletedDate: t,
                  completions: [...d.completions, t].slice(-400),
                  times: { ...(d.times ?? {}), [t]: nowHM },
                  lateDates: !onTime ? [...(d.lateDates ?? []), t].slice(-200) : (d.lateDates ?? []),
                }
              : d,
          );
          profile = checkPerfectDay(profile, dailies);
          profile = checkAchievements(profile);
          set({ profile, dailies });
        },

        // ── Bibliothèque ─────────────────────────────────────────────────
        addFromTemplate: (categoryId, tpl) => {
          const s = get();
          const dup =
            s.dailies.some((d) => d.title === tpl.title) ||
            s.quests.some((q) => !q.completedAt && q.title === tpl.title);
          if (dup) {
            pushToast('info', 'Cette tâche existe déjà dans ton journal', 'info');
            return;
          }
          if (tpl.kind === 'quest') {
            set((st) => ({
              quests: [makeQuest({ title: tpl.title, description: tpl.desc, difficulty: tpl.difficulty, category: categoryId }), ...st.quests],
            }));
          } else {
            set((st) => ({
              dailies: [
                makeDaily({
                  title: tpl.title, description: tpl.desc, difficulty: tpl.difficulty,
                  category: categoryId, days: tpl.days, timeLimit: tpl.before,
                }),
                ...st.dailies,
              ],
            }));
          }
          set((st) => ({
            profile: checkAchievements({
              ...st.profile,
              counters: { ...st.profile.counters, generated: st.profile.counters.generated + 1 },
            }),
          }));
          pushToast('book', `« ${tpl.title} » ajoutée à ton journal`, 'info');
        },

        // ── Oracle ───────────────────────────────────────────────────────
        oracleSend: async (text) => {
          const trimmed = text.trim();
          if (!trimmed) return;
          const userMsg: OracleMessage = { id: uid(), role: 'user', text: trimmed, ts: Date.now() };
          set((s) => ({
            oracleMessages: [...s.oracleMessages, userMsg].slice(-80),
            profile: { ...s.profile, counters: { ...s.profile.counters, oracleAsks: s.profile.counters.oracleAsks + 1 } },
          }));
          const s = get();
          const ctx = oracleCtx(s);
          const hasKey = !!s.profile.llm.apiKey.trim();

          if (hasKey) {
            set({ oracleThinking: true });
            try {
              const history = s.oracleMessages.slice(-10);
              const cloud = await askCloudOracle(trimmed, ctx, history);
              if (cloud.actions) applyOracleActions(cloud.actions);
              oracleSay(cloud.text);
              playSound('oracle', s.profile.soundOn);
              set((st) => ({
                profile: checkAchievements({
                  ...st.profile,
                  counters: { ...st.profile.counters, oracleCloudAsks: st.profile.counters.oracleCloudAsks + 1 },
                }),
              }));
            } catch (e) {
              // Mode hors-ligne résilient : l'Oracle bascule poliment en local, sans jamais bloquer.
              const local = answer(trimmed, ctx);
              if (local.actions) applyOracleActions(local.actions);
              const isOffline = e instanceof OracleOfflineError;
              oracleSay(
                (isOffline
                  ? "Je suis en veille locale — la connexion me manque pour l'instant. "
                  : `Un souci m'empêche de joindre le ciel (${e instanceof Error ? e.message : 'erreur inconnue'}). `) +
                  local.text,
              );
              playSound('oracle', s.profile.soundOn);
              if (!isOffline) pushToast('warning', "L'Oracle en ligne est indisponible pour l'instant", 'warn');
            } finally {
              set({ oracleThinking: false });
            }
          } else {
            const reply = answer(trimmed, ctx);
            if (reply.actions) applyOracleActions(reply.actions);
            oracleSay(reply.text);
            playSound('oracle', s.profile.soundOn);
          }
          set((st) => ({ profile: checkAchievements(st.profile) }));
        },
        oracleClear: () => set({ oracleMessages: [] }),
        setOracleOption: (key, value) =>
          set((s) => ({ profile: { ...s.profile, oracle: { ...s.profile.oracle, [key]: value } } })),

        // ── Boutique ─────────────────────────────────────────────────────
        buyTheme: (id) => {
          const s = get();
          const item = THEMES.find((t) => t.id === id);
          const level = levelFromXp(s.profile.xp).level;
          if (!item || s.profile.ownedThemes.includes(id) || s.profile.gold < item.price) return;
          if (item.unlockLevel && level < item.unlockLevel) return;
          playSound('buy', s.profile.soundOn);
          pushToast('palette', `Thème « ${item.name} » acquis`, 'gold');
          set({
            profile: checkAchievements({
              ...s.profile, gold: s.profile.gold - item.price,
              ownedThemes: [...s.profile.ownedThemes, id], theme: id,
            }),
          });
        },
        buySigil: (id) => {
          const s = get();
          const item = SIGILS.find((x) => x.id === id);
          const level = levelFromXp(s.profile.xp).level;
          if (!item || s.profile.ownedSigils.includes(id) || s.profile.gold < item.price) return;
          if (item.unlockLevel && level < item.unlockLevel) return;
          playSound('buy', s.profile.soundOn);
          pushToast('sparkle', `Sigil « ${item.name} » acquis`, 'gold');
          set({
            profile: checkAchievements({
              ...s.profile, gold: s.profile.gold - item.price,
              ownedSigils: [...s.profile.ownedSigils, id], sigil: id,
            }),
          });
        },
        buyTitle: (id) => {
          const s = get();
          const item = TITLES.find((x) => x.id === id);
          const level = levelFromXp(s.profile.xp).level;
          if (!item || s.profile.ownedTitles.includes(id) || s.profile.gold < item.price) return;
          if (item.unlockLevel && level < item.unlockLevel) return;
          playSound('buy', s.profile.soundOn);
          pushToast('quill', `Titre « ${item.label} » acquis`, 'gold');
          set({
            profile: checkAchievements({
              ...s.profile, gold: s.profile.gold - item.price,
              ownedTitles: [...s.profile.ownedTitles, id], title: id,
            }),
          });
        },
        buyEffect: (id) => {
          const s = get();
          const item = EFFECTS.find((x) => x.id === id);
          const level = levelFromXp(s.profile.xp).level;
          if (!item || item.price === 0 || s.profile.ownedEffects.includes(id) || s.profile.gold < item.price) return;
          if (item.unlockLevel && level < item.unlockLevel) return;
          playSound('buy', s.profile.soundOn);
          pushToast('sparkle', `Effet « ${item.name} » acquis`, 'gold');
          const patch: Partial<Profile> =
            item.kind === 'ambient' ? { ambientFx: id } : { burstFx: id };
          set({
            profile: {
              ...s.profile, ...patch, gold: s.profile.gold - item.price,
              ownedEffects: [...s.profile.ownedEffects, id],
            },
          });
        },

        setTheme: (id) =>
          set((s) => (s.profile.ownedThemes.includes(id) ? { profile: { ...s.profile, theme: id } } : s)),
        setSigil: (id) =>
          set((s) => (s.profile.ownedSigils.includes(id) ? { profile: { ...s.profile, sigil: id } } : s)),
        setTitle: (id) =>
          set((s) => (s.profile.ownedTitles.includes(id) ? { profile: { ...s.profile, title: id } } : s)),
        setAmbient: (id) =>
          set((s) => {
            const level = levelFromXp(s.profile.xp).level;
            return id === 'none' || effectAvailable(s.profile, level, id)
              ? { profile: { ...s.profile, ambientFx: id } }
              : s;
          }),
        setBurst: (id) =>
          set((s) => {
            const level = levelFromXp(s.profile.xp).level;
            return effectAvailable(s.profile, level, id) ? { profile: { ...s.profile, burstFx: id } } : s;
          }),
        // ── Podomètre ────────────────────────────────────────────────────
        addSteps: (n) => {
          if (n <= 0) return;
          const s = get();
          const t = todayStr();
          const counted = { ...s.profile.steps.counted, [t]: (s.profile.steps.counted[t] ?? 0) + n };
          // borne l'historique à 90 jours
          for (const k of Object.keys(counted)) if (k < addDays(t, -90)) delete counted[k];
          const today = (counted[t] ?? 0) + (s.profile.steps.manual[t] ?? 0);
          set({
            profile: checkAchievements({
              ...s.profile,
              steps: { ...s.profile.steps, counted, bestDay: Math.max(s.profile.steps.bestDay, today) },
              counters: { ...s.profile.counters, totalSteps: s.profile.counters.totalSteps + n },
            }),
          });
        },
        addManualSteps: (n) => {
          if (n <= 0) return;
          const s = get();
          const t = todayStr();
          const manual = { ...s.profile.steps.manual, [t]: (s.profile.steps.manual[t] ?? 0) + n };
          for (const k of Object.keys(manual)) if (k < addDays(t, -90)) delete manual[k];
          const today = (s.profile.steps.counted[t] ?? 0) + (manual[t] ?? 0);
          pushToast('heart', `+${n} pas ajoutés`, 'info');
          set({
            profile: checkAchievements({
              ...s.profile,
              steps: { ...s.profile.steps, manual, bestDay: Math.max(s.profile.steps.bestDay, today) },
              counters: { ...s.profile.counters, totalSteps: s.profile.counters.totalSteps + n },
            }),
          });
        },
        setStepsGoal: (n) =>
          set((s) => ({ profile: { ...s.profile, steps: { ...s.profile.steps, goal: Math.max(1000, n) } } })),

        // ── Chronomètre ──────────────────────────────────────────────────
        logTime: (label, seconds, taskId) => {
          if (seconds < 5) return;
          const s = get();
          const entry: TimeLogEntry = {
            id: uid(),
            label: label.trim() || 'Session',
            taskId,
            date: todayStr(),
            startedAt: new Date(Date.now() - seconds * 1000).toTimeString().slice(0, 5),
            seconds: Math.round(seconds),
          };
          const minutes = Math.floor(seconds / 60);
          let profile = {
            ...s.profile,
            counters: {
              ...s.profile.counters,
              chronoSessions: s.profile.counters.chronoSessions + 1,
              chronoMinutes: s.profile.counters.chronoMinutes + minutes,
            },
          };
          // une session soutenue (≥ 10 min) mérite de l'XP : 1 XP / 2 min, plafonné à 30
          if (minutes >= 10) {
            const xp = Math.min(30, Math.round(minutes / 2));
            profile = grantXp(profile, xp);
            playSound('complete', profile.soundOn);
            pushToast('hourglass', `Session « ${entry.label} » : ${minutes} min · +${xp} XP`, 'xp');
          } else {
            pushToast('hourglass', `Session « ${entry.label} » : ${Math.round(seconds)} s enregistrée`, 'info');
          }
          profile = checkAchievements(profile);
          set({ profile, timeLog: [entry, ...s.timeLog].slice(0, 500) });
        },
        deleteTimeLog: (id) => set((s) => ({ timeLog: s.timeLog.filter((e) => e.id !== id) })),

        // ── Alarmes ──────────────────────────────────────────────────────
        setAlarm: (kind, patch) =>
          set((s) => ({
            profile: { ...s.profile, alarms: { ...s.profile.alarms, [kind]: { ...s.profile.alarms[kind], ...patch } } },
          })),
        setCustomAudioName: (name) =>
          set((s) => ({ profile: { ...s.profile, alarms: { ...s.profile.alarms, customAudioName: name } } })),
        recordWake: () => {
          const s = get();
          const t = todayStr();
          if (s.profile.wakeLog[t]) return;
          const wakeLog = { ...s.profile.wakeLog, [t]: new Date().toTimeString().slice(0, 5) };
          for (const k of Object.keys(wakeLog)) if (k < addDays(t, -90)) delete wakeLog[k];
          set({
            profile: checkAchievements({
              ...s.profile,
              wakeLog,
              counters: { ...s.profile.counters, alarmsStopped: s.profile.counters.alarmsStopped + 1 },
            }),
          });
        },

        // ── Notes & traces de vie ──────────────────────────────────────────
        addNote: (kind, text) => {
          if (!text.trim()) return;
          const s = get();
          const entry: NoteEntry = { id: uid(), kind, text: text.trim(), date: todayStr(), ts: Date.now() };
          let profile = s.profile;
          if (kind === 'accomplishment') {
            profile = { ...profile, counters: { ...profile.counters, accomplishments: profile.counters.accomplishments + 1 } };
            // petite XP pour renforcer l'habitude, plafonnée par jour via le combo naturel
            const level = levelFromXp(profile.xp).level;
            profile = grantXp(profile, scaledXp(5, level));
            playSound('complete', profile.soundOn);
            pushToast('star', 'Victoire consignée : +5 XP', 'xp');
          } else {
            profile = { ...profile, counters: { ...profile.counters, notesLogged: profile.counters.notesLogged + 1 } };
            pushToast('quill', kind === 'resolution' ? 'Résolution notée' : 'Note enregistrée', 'info');
          }
          profile = checkAchievements(profile);
          set({ profile, notes: [entry, ...s.notes].slice(0, 1000) });
        },
        deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

        addTransaction: (t) => {
          if (!t.label.trim() || t.amount <= 0) return;
          const tx: Transaction = {
            id: uid(), type: t.type, label: t.label.trim(), amount: Math.round(t.amount * 100) / 100,
            category: t.category, date: t.date ?? todayStr(),
          };
          set((s) => ({ transactions: [tx, ...s.transactions].slice(0, 3000) }));
        },
        deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

        setLLM: (patch) => set((s) => ({ profile: { ...s.profile, llm: { ...s.profile.llm, ...patch } } })),
        completeOnboarding: (data) =>
          set((s) => ({
            profile: {
              ...s.profile,
              onboarding: { done: true, goal: data.goal, rhythm: data.rhythm },
              llm: { ...s.profile.llm, tone: data.tone ?? s.profile.llm.tone },
              notify: {
                ...s.profile.notify,
                intensity: data.tone === 'motivant' ? 'duolingo' : s.profile.notify.intensity,
              },
            },
          })),

        logBreathing: (seconds) => {
          const s = get();
          const minutes = Math.max(1, Math.round(seconds / 60));
          let profile = {
            ...s.profile,
            counters: { ...s.profile.counters, breathingSessions: s.profile.counters.breathingSessions + 1 },
          };
          const xp = Math.min(15, minutes * 3);
          profile = grantXp(profile, xp);
          playSound('perfect', profile.soundOn);
          pushToast('sparkle', `Séance de respiration : +${xp} XP`, 'xp');
          profile = checkAchievements(profile);
          set({ profile });
        },

        setVoice: (patch) => set((s) => ({ profile: { ...s.profile, voice: { ...s.profile.voice, ...patch } } })),

        setName: (name) => set((s) => ({ profile: { ...s.profile, name: name.trim() || 'Aventurier' } })),
        toggleSound: () => set((s) => ({ profile: { ...s.profile, soundOn: !s.profile.soundOn } })),
        toggleMotion: () => set((s) => ({ profile: { ...s.profile, motionOn: !s.profile.motionOn } })),
        setAudio: (patch) => set((s) => ({ profile: { ...s.profile, audio: { ...s.profile.audio, ...patch } } })),
        setNotify: (patch) => set((s) => ({ profile: { ...s.profile, notify: { ...s.profile.notify, ...patch } } })),
        setSyncHost: (host) => set((s) => ({ profile: { ...s.profile, syncHost: host } })),

        resetAll: () =>
          set({
            profile: defaultProfile(), quests: [], dailies: [],
            oracleMessages: [], timeLog: [], notes: [], transactions: [],
            lastReconcile: todayStr(),
          }),

        importSave: (json) => {
          try {
            const data = JSON.parse(json);
            if (!data.profile || !Array.isArray(data.quests) || !Array.isArray(data.dailies)) return false;
            set({
              profile: {
                ...defaultProfile(), ...data.profile,
                counters: { ...defaultCounters(), ...data.profile.counters },
                llm: { ...defaultProfile().llm, ...data.profile.llm },
                onboarding: { ...defaultProfile().onboarding, ...data.profile.onboarding },
              },
              quests: data.quests,
              dailies: data.dailies.map((d: Daily) => ({ ...d, times: d.times ?? {}, lateDates: d.lateDates ?? [] })),
              oracleMessages: data.oracleMessages ?? [],
              timeLog: data.timeLog ?? [],
              notes: data.notes ?? [],
              transactions: data.transactions ?? [],
              lastReconcile: data.lastReconcile ?? todayStr(),
            });
            return true;
          } catch {
            return false;
          }
        },
      };
    },
    {
      name: 'lennyx-save',
      version: 5,
      partialize: (s) => ({
        profile: s.profile,
        quests: s.quests,
        dailies: s.dailies,
        oracleMessages: s.oracleMessages,
        timeLog: s.timeLog,
        notes: s.notes,
        transactions: s.transactions,
        lastReconcile: s.lastReconcile,
      }),
      migrate: (persisted: unknown, version: number) => {
        const data = persisted as Record<string, any>;
        if (version < 2 && data?.profile) {
          const old = data.profile;
          const themes: string[] = Array.isArray(old.ownedThemes) ? old.ownedThemes : [];
          data.profile = {
            ...defaultProfile(),
            name: old.name ?? 'Aventurier',
            xp: old.xp ?? 0,
            gold: old.gold ?? 0,
            currentStreak: old.currentStreak ?? 0,
            maxStreak: old.maxStreak ?? 0,
            lastActiveDate: old.lastActiveDate,
            combo: old.combo ?? 0,
            lastComboDate: old.lastComboDate,
            bestCombo: old.bestCombo ?? 0,
            counters: { ...defaultCounters(), ...old.counters },
            flags: old.flags ?? {},
            unlocked: old.unlocked ?? {},
            ownedThemes: Array.from(new Set(['obsidian', 'nebula', ...themes.filter((t) => THEMES.some((x) => x.id === t))])),
            theme: THEMES.some((x) => x.id === old.theme) ? old.theme : 'obsidian',
            soundOn: old.soundOn ?? true,
            history: old.history ?? {},
          };
          data.oracleMessages = [];
        }
        if (version < 3 && data?.profile) {
          // v3 : réglages audio, notifications, hôte de sync
          const def = defaultProfile();
          data.profile = {
            ...def,
            ...data.profile,
            audio: { ...def.audio, ...data.profile.audio },
            notify: { ...def.notify, ...data.profile.notify },
          };
        }
        if (version < 4 && data?.profile) {
          // v4 : voix, podomètre, alarmes, journal de réveil, chrono, intensité
          const def = defaultProfile();
          data.profile = {
            ...def,
            ...data.profile,
            audio: { ...def.audio, ...data.profile.audio },
            notify: { ...def.notify, ...data.profile.notify },
            voice: { ...def.voice, ...data.profile.voice },
            steps: { ...def.steps, ...data.profile.steps },
            alarms: {
              wake: { ...def.alarms.wake, ...data.profile.alarms?.wake },
              lullaby: { ...def.alarms.lullaby, ...data.profile.alarms?.lullaby },
              customAudioName: data.profile.alarms?.customAudioName,
            },
            wakeLog: data.profile.wakeLog ?? {},
            counters: { ...defaultCounters(), ...data.profile.counters },
          };
          data.dailies = (data.dailies ?? []).map((d: Daily) => ({
            ...d,
            times: d.times ?? {},
            lateDates: d.lateDates ?? [],
          }));
          data.timeLog = data.timeLog ?? [];
        }
        if (version < 5 && data?.profile) {
          // v5 : Oracle en ligne (LLM), onboarding, notes & finances
          const def = defaultProfile();
          data.profile = {
            ...def,
            ...data.profile,
            counters: { ...defaultCounters(), ...data.profile.counters },
            llm: { ...def.llm, ...data.profile.llm },
            // les utilisateurs déjà installés ont fait leurs preuves : pas de tutoriel forcé
            onboarding: { done: true, ...data.profile.onboarding },
          };
          data.notes = data.notes ?? [];
          data.transactions = data.transactions ?? [];
        }
        return data as any;
      },
    },
  ),
);

