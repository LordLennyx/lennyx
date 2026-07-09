import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Quest, Daily, Profile, Toast, LevelUpInfo, SubQuest, OracleMessage, FxEvent, Counters,
} from '../game/types';
import {
  DIFFICULTIES, MISS_PENALTY, RECORD_BONUS, PUNCTUAL_BONUS, LATE_FACTOR,
  addDays, comboMultiplier, isOnTime, isScheduledOn, previousScheduledDate,
  questBaseXp, questGold, scaledXp, streakMultiplier, todayStr, uid,
  type Difficulty, type QuestType,
} from '../game/engine';
import { levelFromXp } from '../game/xp';
import { ACHIEVEMENTS, EFFECTS, SIGILS, THEMES, TITLES, unlocksAtLevel } from '../game/content';
import { answer, briefing, dailiesAtRisk, type OracleAction } from '../game/oracle';
import type { TaskTemplate } from '../game/library';
import { suggestTemplates } from '../game/oracle';
import { playSound } from '../lib/sound';

interface LennyxState {
  profile: Profile;
  quests: Quest[];
  dailies: Daily[];
  oracleMessages: OracleMessage[];
  lastReconcile: string;
  // éphémère (non persisté)
  toasts: Toast[];
  levelUp: LevelUpInfo | null;
  fxEvent: FxEvent | null;

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
  oracleSend: (text: string) => void;
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
  pushToast: (icon: string, text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;
  clearLevelUp: () => void;
  resetAll: () => void;
  importSave: (json: string) => boolean;
}

const defaultCounters = (): Counters => ({
  quests: 0, events: 0, epics: 0, dailies: 0, subquests: 0,
  punctual: 0, late: 0, perfectDays: 0, generated: 0, oracleAsks: 0,
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
  oracle: { briefing: true, sentinel: true },
  history: {},
});

/** Un effet est-il utilisable ? (gratuit niveau atteint, ou acheté) */
export function effectAvailable(p: Profile, level: number, id: string): boolean {
  const e = EFFECTS.find((x) => x.id === id);
  if (!e) return false;
  if (e.price === 0) return (e.unlockLevel ?? 0) <= level;
  return p.ownedEffects.includes(id);
}

const MAX_TOASTS = 4;
let fxSeq = 1;

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
          if (a.kind === 'add-quest' && a.payload) {
            set((s) => ({
              quests: [makeQuest({ ...a.payload!, type: a.payload!.isEvent ? 'event' : 'quest' }), ...s.quests],
            }));
          } else if (a.kind === 'add-daily' && a.payload) {
            set((s) => ({ dailies: [makeDaily(a.payload!), ...s.dailies] }));
          } else if (a.kind === 'generate-day') {
            const s = get();
            const sugg = suggestTemplates({ profile: s.profile, quests: s.quests, dailies: s.dailies }, 4);
            const found = sugg.map((tpl) => {
              const rub = tplRubrique(tpl);
              return makeDaily({
                title: tpl.title, description: tpl.desc, difficulty: tpl.difficulty,
                category: rub, days: tpl.days, timeLimit: tpl.before,
              });
            });
            set((st) => ({
              dailies: [...found, ...st.dailies],
              profile: {
                ...st.profile,
                counters: { ...st.profile.counters, generated: st.profile.counters.generated + found.length },
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
        lastReconcile: todayStr(),
        toasts: [],
        levelUp: null,
        fxEvent: null,

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
            oracleSay(briefing({ profile: st.profile, quests: st.quests, dailies: st.dailies }));
            set((x) => ({ profile: { ...x.profile, oracle: { ...x.profile.oracle, lastBriefing: t } } }));
          }
          // Sentinelle du soir : streaks en danger
          const hour = new Date().getHours();
          if (st.profile.oracle.sentinel && hour >= 18 && st.profile.oracle.lastSentinel !== t) {
            const risk = dailiesAtRisk({ profile: st.profile, quests: st.quests, dailies: st.dailies });
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
          playSound(onTime ? 'complete' : 'fail', profile.soundOn);
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
          const dailies = s.dailies.map((d) =>
            d.id === id
              ? {
                  ...d,
                  streak,
                  bestStreak: Math.max(d.bestStreak, streak),
                  lastCompletedDate: t,
                  completions: [...d.completions, t].slice(-400),
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
        oracleSend: (text) => {
          const trimmed = text.trim();
          if (!trimmed) return;
          const userMsg: OracleMessage = { id: uid(), role: 'user', text: trimmed, ts: Date.now() };
          set((s) => ({
            oracleMessages: [...s.oracleMessages, userMsg].slice(-80),
            profile: { ...s.profile, counters: { ...s.profile.counters, oracleAsks: s.profile.counters.oracleAsks + 1 } },
          }));
          const s = get();
          const reply = answer(trimmed, { profile: s.profile, quests: s.quests, dailies: s.dailies });
          if (reply.actions) applyOracleActions(reply.actions);
          oracleSay(reply.text);
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
        setName: (name) => set((s) => ({ profile: { ...s.profile, name: name.trim() || 'Aventurier' } })),
        toggleSound: () => set((s) => ({ profile: { ...s.profile, soundOn: !s.profile.soundOn } })),
        toggleMotion: () => set((s) => ({ profile: { ...s.profile, motionOn: !s.profile.motionOn } })),

        resetAll: () =>
          set({
            profile: defaultProfile(), quests: [], dailies: [],
            oracleMessages: [], lastReconcile: todayStr(),
          }),

        importSave: (json) => {
          try {
            const data = JSON.parse(json);
            if (!data.profile || !Array.isArray(data.quests) || !Array.isArray(data.dailies)) return false;
            set({
              profile: { ...defaultProfile(), ...data.profile, counters: { ...defaultCounters(), ...data.profile.counters } },
              quests: data.quests,
              dailies: data.dailies,
              oracleMessages: data.oracleMessages ?? [],
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
      version: 2,
      partialize: (s) => ({
        profile: s.profile,
        quests: s.quests,
        dailies: s.dailies,
        oracleMessages: s.oracleMessages,
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
        return data as any;
      },
    },
  ),
);

// petite aide : retrouver la rubrique d'un template (import circulaire évité)
import { LIBRARY } from '../game/library';
function tplRubrique(tpl: TaskTemplate): string | undefined {
  for (const r of LIBRARY) if (r.templates.includes(tpl)) return r.id;
  return undefined;
}
