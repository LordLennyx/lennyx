// ── Réveil et berceuse : pont vers Android ────────────────────────────────
// Le réglage vit dans l'application ; le déclenchement, lui, appartient au
// système. C'est la seule façon d'obtenir un réveil qui s'impose à l'écran
// alors que Lennyx est fermé, le téléphone verrouillé ou l'écran éteint —
// une page web, elle, n'existe plus dès qu'on quitte l'application.
//
// Sur Windows et sur le web, ce module est inerte : l'overlay React
// (AlarmOverlay) prend le relais tant que la fenêtre est ouverte.

import { registerPlugin, Capacitor } from '@capacitor/core';

export type AlarmKind = 'wake' | 'lullaby';

export interface AlarmConfig {
  kind: AlarmKind;
  on: boolean;
  time: string; // HH:MM
  days: number[]; // 0 = dimanche … 6 = samedi, vide = tous les jours
  label: string;
  repeatMin: number; // relance tant que l'arrêt n'est pas demandé
  volume: number; // 0..1
  audioPath?: string; // extrait choisi par l'utilisateur
  startMs: number; // début de l'extrait
  endMs: number; // fin de l'extrait (0 = jusqu'au bout)
  imagePath?: string; // fond affiché pendant la sonnerie
}

export interface AlarmNativeStatus {
  /** Android 14+ : l'autorisation « plein écran » a-t-elle été accordée ? */
  fullScreen: boolean;
  /** Le volume ALARME du téléphone est-il à zéro ? */
  alarmVolumeSilent: boolean;
}

interface LennyxAlarmPlugin {
  configure(o: AlarmConfig): Promise<{ scheduled: boolean; nextAt?: number }>;
  cancel(o: { kind: AlarmKind }): Promise<void>;
  preview(o: { kind: AlarmKind }): Promise<void>;
  stop(): Promise<void>;
  status(): Promise<AlarmNativeStatus>;
  requestFullScreen(): Promise<{ granted: boolean }>;
  saveMedia(o: { name: string; data: string }): Promise<{ path: string; bytes: number }>;
  consumeStopped(): Promise<Partial<Record<AlarmKind, { date: string; time: string }>>>;
}

const Alarm = registerPlugin<LennyxAlarmPlugin>('LennyxAlarm');

export const alarmNativeSupported = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export async function configureAlarm(cfg: AlarmConfig): Promise<number | null> {
  if (!alarmNativeSupported()) return null;
  try {
    const res = await Alarm.configure(cfg);
    return res.nextAt ?? null;
  } catch {
    return null;
  }
}

export async function cancelAlarm(kind: AlarmKind): Promise<void> {
  if (!alarmNativeSupported()) return;
  try {
    await Alarm.cancel({ kind });
  } catch {
    /* non bloquant */
  }
}

/** Déclenche le réveil tout de suite : l'essayer est le seul moyen d'y croire. */
export async function previewAlarm(kind: AlarmKind): Promise<boolean> {
  if (!alarmNativeSupported()) return false;
  try {
    await Alarm.preview({ kind });
    return true;
  } catch {
    return false;
  }
}

export async function stopNativeAlarm(): Promise<void> {
  if (!alarmNativeSupported()) return;
  try {
    await Alarm.stop();
  } catch {
    /* non bloquant */
  }
}

export async function alarmNativeStatus(): Promise<AlarmNativeStatus> {
  if (!alarmNativeSupported()) return { fullScreen: true, alarmVolumeSilent: false };
  try {
    return await Alarm.status();
  } catch {
    return { fullScreen: true, alarmVolumeSilent: false };
  }
}

export async function requestFullScreenPermission(): Promise<boolean> {
  if (!alarmNativeSupported()) return true;
  try {
    const { granted } = await Alarm.requestFullScreen();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Dépose un média dans le stockage privé de l'application et renvoie son
 * chemin natif. Le fichier reste sur l'appareil : rien n'est envoyé nulle part.
 */
export async function saveAlarmMedia(name: string, blob: Blob): Promise<string | null> {
  if (!alarmNativeSupported()) return null;
  try {
    const data = await blobToBase64(blob);
    const { path } = await Alarm.saveMedia({ name, data });
    return path;
  } catch {
    return null;
  }
}

/** Arrêts de réveil enregistrés par l'écran natif pendant que l'app dormait. */
export async function consumeNativeStops(): Promise<
  Partial<Record<AlarmKind, { date: string; time: string }>>
> {
  if (!alarmNativeSupported()) return {};
  try {
    return await Alarm.consumeStopped();
  } catch {
    return {};
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('lecture impossible'));
    reader.onload = () => {
      const url = String(reader.result);
      // On ne transmet que la charge utile, sans l'en-tête « data:…;base64, »
      resolve(url.slice(url.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}
