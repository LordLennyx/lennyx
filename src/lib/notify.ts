// ── Notifications de Lennyx : le pilier ──────────────────────────────────
// Sept familles, chacune avec SA sonnerie et son canal Android dédié :
//   reminder  — rappel calme, la fenêtre approche
//   urgent    — le temps presse vraiment (moins de 15 min)
//   lastcall  — la fenêtre s'est refermée
//   sentinel  — le soir, les streaks sont en jeu
//   briefing  — le programme du matin
//   celebrate — niveaux, records, journées parfaites
//   nag       — relance insistante (mode Duolingo)
//
// Les sonneries vivent dans android/app/src/main/res/raw/, synthétisées au
// build par scripts/gen-sounds.mjs (aucun fichier audio importé).
//
// ⚠ Un canal Android est IMMUABLE une fois créé : changer une sonnerie exige
// un nouvel identifiant de canal. D'où le suffixe de version ci-dessous — à
// incrémenter à chaque modification des sons ou de l'importance.

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { playSound, type SoundKind } from './sound';

export type NotifKind =
  | 'reminder' | 'urgent' | 'lastcall' | 'sentinel' | 'briefing' | 'celebrate' | 'nag';

const CHANNEL_VERSION = 'v2';

const SOUND_FOR: Record<NotifKind, SoundKind> = {
  reminder: 'notify',
  urgent: 'notify',
  lastcall: 'sentinel',
  sentinel: 'sentinel',
  briefing: 'briefing',
  celebrate: 'celebrate',
  nag: 'sentinel',
};

interface ChannelDef {
  kind: NotifKind;
  id: string;
  name: string;
  description: string;
  importance: 3 | 4 | 5;
  sound: string;
}

const CHANNEL_DEFS: ChannelDef[] = [
  {
    kind: 'reminder', id: `lennyx-reminder-${CHANNEL_VERSION}`,
    name: 'Rappels de tâches', description: 'Une échéance approche',
    importance: 4, sound: 'notif_reminder.wav',
  },
  {
    kind: 'urgent', id: `lennyx-urgent-${CHANNEL_VERSION}`,
    name: 'Dernières minutes', description: 'Il reste moins d’un quart d’heure',
    importance: 5, sound: 'notif_urgent.wav',
  },
  {
    kind: 'lastcall', id: `lennyx-lastcall-${CHANNEL_VERSION}`,
    name: 'Fenêtres manquées', description: 'L’heure limite est passée',
    importance: 5, sound: 'notif_lastcall.wav',
  },
  {
    kind: 'sentinel', id: `lennyx-sentinel-${CHANNEL_VERSION}`,
    name: 'Sentinelle', description: 'Tes streaks sont en danger',
    importance: 4, sound: 'notif_sentinel.wav',
  },
  {
    kind: 'briefing', id: `lennyx-briefing-${CHANNEL_VERSION}`,
    name: 'Briefing', description: 'Le programme du jour',
    importance: 3, sound: 'notif_briefing.wav',
  },
  {
    kind: 'celebrate', id: `lennyx-glory-${CHANNEL_VERSION}`,
    name: 'Célébrations', description: 'Niveaux, records et journées parfaites',
    importance: 3, sound: 'notif_celebrate.wav',
  },
  {
    kind: 'nag', id: `lennyx-nag-${CHANNEL_VERSION}`,
    name: 'Relances', description: 'Quand tu traînes un peu trop',
    importance: 4, sound: 'notif_nag.wav',
  },
];

export const CHANNEL_FOR = CHANNEL_DEFS.reduce<Record<NotifKind, string>>(
  (acc, c) => { acc[c.kind] = c.id; return acc; },
  {} as Record<NotifKind, string>,
);

const SOUND_FILE_FOR = CHANNEL_DEFS.reduce<Record<NotifKind, string>>(
  (acc, c) => { acc[c.kind] = c.sound; return acc; },
  {} as Record<NotifKind, string>,
);

export const isNative = (): boolean => Capacitor.isNativePlatform();

export async function ensurePermission(): Promise<boolean> {
  try {
    if (isNative()) {
      const st = await LocalNotifications.requestPermissions();
      if (st.display === 'granted') {
        for (const ch of CHANNEL_DEFS) {
          await LocalNotifications.createChannel({
            id: ch.id,
            name: ch.name,
            description: ch.description,
            importance: ch.importance,
            sound: ch.sound,
            vibration: true,
            visibility: 1,
          }).catch(() => {});
        }
        return true;
      }
      return false;
    }
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export function permissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (isNative()) return 'granted'; // géré par ensurePermission au premier réglage
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Notification immédiate (application au premier plan) + sonorité dédiée. */
export function notifyNow(kind: NotifKind, title: string, body: string, soundOn: boolean) {
  playSound(SOUND_FOR[kind], soundOn);
  try {
    if (isNative()) {
      void LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(100000 + Math.random() * 800000),
            title,
            body,
            channelId: CHANNEL_FOR[kind],
            sound: SOUND_FILE_FOR[kind],
            schedule: { at: new Date(Date.now() + 400) },
          },
        ],
      });
      return;
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const n = new Notification(title, { body, silent: true, tag: `lennyx-${kind}-${Date.now()}` });
      setTimeout(() => n.close(), 12000);
    }
  } catch {
    /* la notification est un bonus, jamais une erreur bloquante */
  }
}

export interface ScheduledItem {
  id: number;
  kind: NotifKind;
  title: string;
  body: string;
  at: Date;
}

/**
 * (Android) Reprogramme toutes les notifications à venir — même app fermée.
 * Android plafonne à ~500 alarmes par application : on borne largement en deçà,
 * en gardant les plus proches dans le temps (les plus utiles).
 */
const MAX_SCHEDULED = 400;

export async function rescheduleNative(items: ScheduledItem[]) {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    const future = items
      .filter((i) => i.at.getTime() > Date.now() + 5000)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .slice(0, MAX_SCHEDULED);
    if (future.length === 0) return;
    await LocalNotifications.schedule({
      notifications: future.map((i) => ({
        id: i.id,
        title: i.title,
        body: i.body,
        channelId: CHANNEL_FOR[i.kind],
        sound: SOUND_FILE_FOR[i.kind],
        schedule: { at: i.at, allowWhileIdle: true },
      })),
    });
  } catch {
    /* idem : jamais bloquant */
  }
}

// ── anti-doublon pour le planificateur au premier plan ────────────────────
const FIRED_KEY = 'lennyx-notified';

function loadFired(): Record<string, true> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    // purge des jours précédents (date LOCALE, cohérente avec todayStr())
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const out: Record<string, true> = {};
    for (const k of Object.keys(data)) if (k.startsWith(today)) out[k] = true;
    return out;
  } catch {
    return {};
  }
}

let fired = loadFired();

export function alreadyFired(key: string): boolean {
  return !!fired[key];
}

export function markFired(key: string) {
  fired[key] = true;
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
  } catch {
    /* stockage plein : tant pis */
  }
}
