// ── Notifications de Lennyx : un pilier ──────────────────────────────────
// Trois canaux selon la plateforme :
//  • Android (Capacitor) : vraies notifications programmées, même app fermée
//  • Electron / Web : Notification API (app ouverte) + son synthétisé
// Types : rappel de tâche chronométrée, dernier appel, briefing du matin,
// sentinelle du soir, célébrations. Chacun a sa sonorité.

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { playSound, type SoundKind } from './sound';

export type NotifKind = 'reminder' | 'lastcall' | 'sentinel' | 'briefing' | 'celebrate';

const SOUND_FOR: Record<NotifKind, SoundKind> = {
  reminder: 'notify',
  lastcall: 'sentinel',
  sentinel: 'sentinel',
  briefing: 'briefing',
  celebrate: 'celebrate',
};

const CHANNELS: Array<{ id: string; name: string; description: string; importance: 3 | 4 | 5 }> = [
  { id: 'lennyx-reminders', name: 'Rappels de tâches', description: 'Tâches chronométrées et derniers appels', importance: 5 },
  { id: 'lennyx-alerts', name: 'Sentinelle', description: 'Streaks en danger le soir', importance: 4 },
  { id: 'lennyx-daily', name: 'Briefing', description: 'Programme du matin', importance: 3 },
  { id: 'lennyx-glory', name: 'Célébrations', description: 'Niveaux, records et journées parfaites', importance: 3 },
];

export const CHANNEL_FOR: Record<NotifKind, string> = {
  reminder: 'lennyx-reminders',
  lastcall: 'lennyx-reminders',
  sentinel: 'lennyx-alerts',
  briefing: 'lennyx-daily',
  celebrate: 'lennyx-glory',
};

export const isNative = (): boolean => Capacitor.isNativePlatform();

export async function ensurePermission(): Promise<boolean> {
  try {
    if (isNative()) {
      const st = await LocalNotifications.requestPermissions();
      if (st.display === 'granted') {
        for (const ch of CHANNELS) {
          await LocalNotifications.createChannel({ ...ch, vibration: true }).catch(() => {});
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

/** Notification immédiate (app au premier plan) + sonorité dédiée. */
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
            schedule: { at: new Date(Date.now() + 400) },
          },
        ],
      });
      return;
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const n = new Notification(title, { body, silent: true, tag: `lennyx-${kind}` });
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

/** (Android) Reprogramme toutes les notifications à venir — même app fermée. */
export async function rescheduleNative(items: ScheduledItem[]) {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    const future = items.filter((i) => i.at.getTime() > Date.now() + 5000);
    if (future.length === 0) return;
    await LocalNotifications.schedule({
      notifications: future.map((i) => ({
        id: i.id,
        title: i.title,
        body: i.body,
        channelId: CHANNEL_FOR[i.kind],
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
