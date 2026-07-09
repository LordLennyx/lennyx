import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Quest, Daily, Profile, Toast, LevelUpInfo, SubQuest } from '../game/types';
import {
  DIFFICULTIES,
  MISS_PENALTY,
  RECORD_BONUS,
  addDays,
  comboMultiplier,
  isScheduledOn,
  previousScheduledDate,
  questBaseXp,
  questGold,
  scaledXp,
  streakMultiplier,
  todayStr,
  uid,
  type Difficulty,
  type QuestType,
} from '../game/engine';
import { levelFromXp } from '../game/xp';
import { ACHIEVEMENTS, AVATARS, THEMES } from '../game/content';
import { playSound } from '../lib/sound';

interface LennyxState {
  profile: Profile;
  quests: Quest[];
  dailies: Daily[];
  lastReconcile: string;
  // éphémère (non persisté)
  toasts: Toast[];
  levelUp: LevelUpInfo | null;

  // actions
  reconcile: () => void;
  addQuest: (q: {
    title: string;
    description?: string;
    type: QuestType;
    difficulty: Difficulty;
    category?: string;
    deadline?: string;
    subquests: string[];
  }) => void;
  updateQuest: (id: string, patch: Partial<Quest>) => void;
  deleteQuest: (id: string) => void;
  toggleSubquest: (questId: string, subId: string) => void;
  completeQuest: (id: string) => void;
  addDaily: (d: { title: string; description?: string; difficulty: Difficulty; days: number[] }) => void;
  updateDaily: (id: string, patch: Partial<Daily>) => void;
  deleteDaily: (id: string) => void;
  completeDaily: (id: string) => void;
  buyAvatar: (emoji: string) => void;
  buyTheme: (id: string) => void;
  setAvatar: (emoji: string) => void;
  setTheme: (id: string) => void;
  setName: (name: string) => void;
  toggleSound: () => void;
  pushToast: (icon: string, text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;
  clearLevelUp: () => void;
  resetAll: () => void;
  importSave: (json: string) => boolean;
}

const defaultProfile = (): Profile => ({
  name: 'Aventurier',
  avatar: '🙂',
  xp: 0,
  gold: 0,
  currentStreak: 0,
  maxStreak: 0,
  combo: 0,
  bestCombo: 0,
  counters: { quests: 0, events: 0, epics: 0, dailies: 0, subquests: 0 },
  flags: {},
  unlocked: {},
  ownedAvatars: ['🙂', '😎', '🤖'],
  ownedThemes: ['nebula'],
  theme: 'nebula',
  soundOn: true,
  history: {},
});

const MAX_TOASTS = 4;

export const useStore = create<LennyxState>()(
  persist(
    (set, get) => {
      // ── helpers internes ────────────────────────────────────────────

      const pushToast = (icon: string, text: string, kind: Toast['kind'] = 'info') => {
        const toast: Toast = { id: uid(), icon, text, kind };
        set((s) => ({ toasts: [...s.toasts, toast].slice(-MAX_TOASTS) }));
      };

      /** Ajoute de l'XP (peut être négatif), détecte les level-up. */
      const grantXp = (p: Profile, amount: number): Profile => {
        const before = levelFromXp(p.xp);
        const xp = Math.max(0, p.xp + amount);
        const after = levelFromXp(xp);
        const t = todayStr();
        const history = { ...p.history, [t]: (p.history[t] ?? 0) + Math.max(0, amount) };
        if (after.level > before.level) {
          playSound('levelup', p.soundOn);
          set({
            levelUp: {
              level: after.level,
              rankName: after.rank.name,
              rankIcon: after.rank.icon,
              rankChanged: after.rank.name !== before.rank.name,
            },
          });
        }
        return { ...p, xp, history };
      };

      /** Enregistre une activité aujourd'hui : combo + streak global. */
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
          ...p,
          combo,
          lastComboDate: t,
          bestCombo: Math.max(p.bestCombo, combo),
          currentStreak,
          maxStreak,
          lastActiveDate,
          flags,
        };
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
            pushToast(a.icon, `Succès débloqué : ${a.name} ${a.gold > 0 ? `(+${a.gold} 🪙)` : ''}`, 'achievement');
          }
        }
        if (any) playSound('achievement', p.soundOn);
        return { ...p, gold, unlocked };
      };

      return {
        profile: defaultProfile(),
        quests: [],
        dailies: [],
        lastReconcile: todayStr(),
        toasts: [],
        levelUp: null,

        pushToast,
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        clearLevelUp: () => set({ levelUp: null }),

        // ── Rattrapage à l'ouverture : quotidiennes manquées, streak global ──
        reconcile: () => {
          const s = get();
          const t = todayStr();
          const yesterday = addDays(t, -1);
          if (s.lastReconcile >= yesterday && s.profile.lastComboDate === t) {
            // rien à faire, on est à jour
          }
          let profile = { ...s.profile };
          // combo remis à zéro si nouveau jour
          if (profile.lastComboDate !== t) profile.combo = 0;
          // streak global cassé si aucune activité hier ni aujourd'hui
          if (
            profile.lastActiveDate &&
            profile.lastActiveDate < yesterday &&
            profile.currentStreak > 0
          ) {
            profile.currentStreak = 0;
            pushToast('💔', 'Ton streak global est retombé à zéro…', 'warn');
          }
          // quotidiennes manquées entre lastReconcile et hier (max 60 jours)
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
            pushToast('😬', `${missed} quête(s) quotidienne(s) manquée(s) : -${penalty} XP`, 'warn');
          }
          set({ profile, dailies, lastReconcile: t });
        },

        // ── Quêtes ────────────────────────────────────────────────────
        addQuest: (q) =>
          set((s) => ({
            quests: [
              {
                id: uid(),
                title: q.title,
                description: q.description,
                type: q.type,
                difficulty: q.difficulty,
                category: q.category,
                deadline: q.deadline || undefined,
                subquests: q.subquests
                  .filter((t) => t.trim())
                  .map((t): SubQuest => ({ id: uid(), title: t.trim(), done: false })),
                createdAt: new Date().toISOString(),
              },
              ...s.quests,
            ],
          })),

        updateQuest: (id, patch) =>
          set((s) => ({ quests: s.quests.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),

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
            profile = {
              ...profile,
              counters: { ...profile.counters, subquests: profile.counters.subquests + 1 },
            };
            playSound('complete', profile.soundOn);
            pushToast('✅', `Sous-quête accomplie : +${xp} XP`, 'xp');
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

        completeQuest: (id) => {
          const s = get();
          const quest = s.quests.find((q) => q.id === id);
          if (!quest || quest.completedAt) return;
          let profile = registerActivity(s.profile);
          const level = levelFromXp(profile.xp).level;
          const base = questBaseXp(quest.difficulty, quest.type);
          const xp = Math.round(scaledXp(base, level) * comboMultiplier(profile.combo));
          const gold = questGold(quest.difficulty, quest.type);
          profile = grantXp(profile, xp);
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
          const comboTxt = profile.combo > 1 ? ` · Combo x${profile.combo}` : '';
          pushToast(quest.type === 'event' ? '🌟' : '⚔️', `+${xp} XP · +${gold} 🪙${comboTxt}`, 'xp');
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

        // ── Quotidiennes ──────────────────────────────────────────────
        addDaily: (d) =>
          set((s) => ({
            dailies: [
              {
                id: uid(),
                title: d.title,
                description: d.description,
                difficulty: d.difficulty,
                days: d.days,
                createdAt: todayStr(),
                streak: 0,
                bestStreak: 0,
                completions: [],
              },
              ...s.dailies,
            ],
          })),

        updateDaily: (id, patch) =>
          set((s) => ({ dailies: s.dailies.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

        deleteDaily: (id) => set((s) => ({ dailies: s.dailies.filter((d) => d.id !== id) })),

        completeDaily: (id) => {
          const s = get();
          const t = todayStr();
          const daily = s.dailies.find((d) => d.id === id);
          if (!daily || daily.lastCompletedDate === t) return;
          let profile = registerActivity(s.profile);
          // streak de la quotidienne : continue si la dernière occurrence programmée a été faite
          const prev = previousScheduledDate(daily.days, t);
          const streak = daily.lastCompletedDate === prev ? daily.streak + 1 : 1;
          const isRecord = streak > daily.bestStreak && daily.bestStreak > 0;
          const level = levelFromXp(profile.xp).level;
          const base = DIFFICULTIES[daily.difficulty].dailyXp;
          let xp = Math.round(
            scaledXp(base, level) * streakMultiplier(streak) * comboMultiplier(profile.combo),
          );
          if (isRecord) xp = Math.round(xp * (1 + RECORD_BONUS));
          const gold = Math.max(2, Math.round(DIFFICULTIES[daily.difficulty].gold / 2));
          profile = grantXp(profile, xp);
          profile = {
            ...profile,
            gold: profile.gold + gold,
            counters: { ...profile.counters, dailies: profile.counters.dailies + 1 },
            flags: isRecord ? { ...profile.flags, recordBreaker: true } : profile.flags,
          };
          playSound('complete', profile.soundOn);
          pushToast(
            isRecord ? '📈' : '🔥',
            isRecord
              ? `NOUVEAU RECORD ! Streak x${streak} · +${xp} XP · +${gold} 🪙`
              : `+${xp} XP · +${gold} 🪙 · Streak x${streak}`,
            'xp',
          );
          profile = checkAchievements(profile);
          set({
            profile,
            dailies: s.dailies.map((d) =>
              d.id === id
                ? {
                    ...d,
                    streak,
                    bestStreak: Math.max(d.bestStreak, streak),
                    lastCompletedDate: t,
                    completions: [...d.completions, t].slice(-400),
                  }
                : d,
            ),
          });
        },

        // ── Boutique / profil ─────────────────────────────────────────
        buyAvatar: (emoji) => {
          const s = get();
          const item = AVATARS.find((a) => a.emoji === emoji);
          if (!item || s.profile.ownedAvatars.includes(emoji) || s.profile.gold < item.price) return;
          playSound('buy', s.profile.soundOn);
          pushToast('🛍️', `Avatar ${emoji} débloqué !`, 'gold');
          set({
            profile: checkAchievements({
              ...s.profile,
              gold: s.profile.gold - item.price,
              ownedAvatars: [...s.profile.ownedAvatars, emoji],
              avatar: emoji,
            }),
          });
        },

        buyTheme: (id) => {
          const s = get();
          const item = THEMES.find((t) => t.id === id);
          if (!item || s.profile.ownedThemes.includes(id) || s.profile.gold < item.price) return;
          playSound('buy', s.profile.soundOn);
          pushToast('🎨', `Thème « ${item.name} » débloqué !`, 'gold');
          set({
            profile: {
              ...s.profile,
              gold: s.profile.gold - item.price,
              ownedThemes: [...s.profile.ownedThemes, id],
              theme: id,
            },
          });
        },

        setAvatar: (emoji) =>
          set((s) =>
            s.profile.ownedAvatars.includes(emoji) ? { profile: { ...s.profile, avatar: emoji } } : s,
          ),
        setTheme: (id) =>
          set((s) =>
            s.profile.ownedThemes.includes(id) ? { profile: { ...s.profile, theme: id } } : s,
          ),
        setName: (name) => set((s) => ({ profile: { ...s.profile, name: name.trim() || 'Aventurier' } })),
        toggleSound: () => set((s) => ({ profile: { ...s.profile, soundOn: !s.profile.soundOn } })),

        resetAll: () =>
          set({ profile: defaultProfile(), quests: [], dailies: [], lastReconcile: todayStr() }),

        importSave: (json) => {
          try {
            const data = JSON.parse(json);
            if (!data.profile || !Array.isArray(data.quests) || !Array.isArray(data.dailies)) return false;
            set({
              profile: { ...defaultProfile(), ...data.profile },
              quests: data.quests,
              dailies: data.dailies,
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
      version: 1,
      partialize: (s) => ({
        profile: s.profile,
        quests: s.quests,
        dailies: s.dailies,
        lastReconcile: s.lastReconcile,
      }),
    },
  ),
);
