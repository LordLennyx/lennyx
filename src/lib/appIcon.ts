// ── L'icône de l'application change de visage ─────────────────────────────
// Android : bascule d'activity-alias (plugin LennyxIcon).
// Web / PWA : on remplace le favicon par le blason de l'humeur.
// Windows : l'icône de la fenêtre et de la barre des tâches, via Electron.
//
// ⚠️ GARDE-FOU IMPORTANT (Android) : changer d'alias peut faire tomber le
// raccourci posé sur l'écran d'accueil par certains lanceurs. On ne bascule
// donc que si l'humeur a VRAIMENT changé, et jamais plus d'une fois par
// demi-heure. Le confort passe avant l'effet.

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { MoodId } from '../game/mood';

interface IconPlugin {
  current(): Promise<{ mood: string; supported: boolean }>;
  setMood(options: { mood: string; force?: boolean }): Promise<{ changed: boolean; mood: string; error?: string }>;
  reset(): Promise<{ mood: string; error?: string }>;
}

const LennyxIcon = registerPlugin<IconPlugin>('LennyxIcon');

const STORE_KEY = 'lennyx-icon-mood';
/** Délai minimal entre deux bascules d'icône Android. */
const COOLDOWN_MS = 30 * 60_000;

export function appIconSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

interface Applied {
  mood: string;
  at: number;
}

function lastApplied(): Applied | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Applied) : null;
  } catch {
    return null;
  }
}

function remember(mood: string) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ mood, at: Date.now() } satisfies Applied));
  } catch {
    /* stockage plein ou refusé : l'icône n'est pas vitale */
  }
}

/** Le favicon du navigateur suit l'humeur — visible dans l'onglet et le Dock. */
function applyWebFavicon(mood: MoodId) {
  if (typeof document === 'undefined') return;
  const href = `${import.meta.env.BASE_URL ?? './'}icons/mood-${mood}.svg`.replace(/\/{2,}/g, '/');
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-mood]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.setAttribute('data-mood', '1');
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

/** Icône de la fenêtre Windows, si le pont Electron est présent. */
function applyElectronIcon(mood: MoodId) {
  const bridge = (window as unknown as { lennyxIcon?: { set(mood: string): void } }).lennyxIcon;
  try {
    bridge?.set(mood);
  } catch {
    /* ornement : jamais bloquant */
  }
}

/**
 * Applique l'humeur à l'icône. `enabled` vient des Réglages : quand
 * l'utilisateur refuse la bascule Android, on remet l'icône neutre une fois
 * plutôt que de le laisser avec un visage inquiet gravé dans le marbre.
 */
export async function applyMoodIcon(mood: MoodId, enabled: boolean): Promise<void> {
  applyWebFavicon(mood);
  applyElectronIcon(mood);

  if (!appIconSupported()) return;

  if (!enabled) {
    const previous = lastApplied();
    if (previous && previous.mood !== 'serein') {
      try {
        await LennyxIcon.reset();
        remember('serein');
      } catch {
        /* sans importance */
      }
    }
    return;
  }

  const previous = lastApplied();
  if (previous && previous.mood === mood) return;
  if (previous && Date.now() - previous.at < COOLDOWN_MS) return;

  try {
    const res = await LennyxIcon.setMood({ mood });
    if (res.changed) remember(res.mood);
  } catch {
    /* l'icône est un ornement : son échec ne doit jamais remonter */
  }
}

/** Remet l'icône neutre — appelé quand on éteint la fonction dans les Réglages. */
export async function resetMoodIcon(): Promise<void> {
  if (!appIconSupported()) return;
  try {
    await LennyxIcon.reset();
    remember('serein');
  } catch {
    /* rien à faire */
  }
}
