// ── Capture vocale : trois moteurs, une seule interface ──────────────────
//
// 1. Android (le chemin de référence) : plugin natif LennyxSpeech, qui pilote
//    android.speech avec EXTRA_PREFER_OFFLINE. La reconnaissance tourne SUR
//    L'APPAREIL — aucune clé, aucun quota, aucune donnée qui sort. C'est ce
//    qui permet de dicter sa journée en avion ou sans forfait.
// 2. Web / PWA (Chrome, Edge, Safari) : Web Speech API. Safari reconnaît en
//    local ; Chrome passe par ses serveurs — on le signale honnêtement plutôt
//    que de le cacher.
// 3. Electron (le .exe Windows) : Chromium y est livré SANS les clés du moteur
//    vocal de Google, `webkitSpeechRecognition` existe mais échoue toujours.
//    On ne fait pas semblant : on bascule sur la saisie au clavier et on
//    indique la dictée système de Windows (Win + H), qui écrit directement
//    dans le champ — le parseur, lui, fonctionne de la même façon.
//
// ⚠️ La capture est la SEULE chose qui change d'une plateforme à l'autre.
// L'analyse (voiceParse.ts) et l'écran de validation sont communs : une dictée
// tapée au clavier suit exactement le même chemin qu'une dictée parlée.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type DictationEngine = 'android' | 'web' | 'clavier';

export interface DictationStatus {
  engine: DictationEngine;
  /** Le micro peut-il être écouté ici ? */
  available: boolean;
  /** La reconnaissance se fait-elle sur l'appareil ? */
  offline: boolean;
  /** Explication affichable, toujours honnête. */
  detail: string;
  /** Nom du moteur système, pour le diagnostic. */
  provider?: string;
}

interface SpeechPlugin {
  available(): Promise<{ available: boolean; hasPermission: boolean; engine: string }>;
  requestMic(): Promise<{ granted: boolean }>;
  start(options: { offlineOnly: boolean }): Promise<void>;
  stop(): Promise<{ text: string }>;
  cancel(): Promise<void>;
  openSettings(): Promise<{ opened: boolean }>;
  addListener(event: 'partial' | 'final' | 'error' | 'ready' | 'level', cb: (data: { text?: string; done?: boolean; level?: number }) => void): Promise<PluginListenerHandle>;
}

const Speech = registerPlugin<SpeechPlugin>('LennyxSpeech');

const isNative = () => Capacitor.isNativePlatform();

/** Electron : Chromium sans les clés du moteur vocal. Inutile d'insister. */
function isElectron(): boolean {
  if (typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent)) return true;
  return typeof window !== 'undefined' && 'lennyxSync' in window;
}

type SpeechRecognitionCtor = new () => any;

function webRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, SpeechRecognitionCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Safari fait la reconnaissance sur l'appareil ; Chrome passe par le réseau. */
function webIsOnDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/chrome|chromium|edg/i.test(ua);
}

export async function dictationStatus(): Promise<DictationStatus> {
  if (isNative() && Capacitor.getPlatform() === 'android') {
    try {
      const res = await Speech.available();
      if (!res.available) {
        return {
          engine: 'android',
          available: false,
          offline: false,
          detail:
            'Aucun moteur de reconnaissance vocale n’est installé sur ce téléphone. ' +
            'Installe « Services vocaux Google » (ou le moteur de ton constructeur), puis reviens.',
        };
      }
      return {
        engine: 'android',
        available: true,
        offline: true,
        provider: res.engine,
        detail:
          'Reconnaissance sur l’appareil, hors ligne. Si rien n’est reconnu, télécharge le ' +
          'paquet FRANÇAIS hors connexion depuis les réglages de saisie vocale — c’est gratuit.',
      };
    } catch {
      return { engine: 'android', available: false, offline: false, detail: 'Le moteur vocal natif n’a pas répondu.' };
    }
  }

  if (isElectron()) {
    return {
      engine: 'clavier',
      available: false,
      offline: true,
      detail:
        'Dans l’application Windows, le moteur vocal de Chromium n’est pas disponible. ' +
        'Utilise la dictée de Windows — touches Windows + H — directement dans le champ ci-dessous : ' +
        'elle écrit le texte, et Lennyx le comprend exactement de la même façon.',
    };
  }

  if (webRecognition()) {
    const onDevice = webIsOnDevice();
    return {
      engine: 'web',
      available: true,
      offline: onDevice,
      detail: onDevice
        ? 'Reconnaissance assurée par le système, sur l’appareil.'
        : 'Ce navigateur délègue la reconnaissance aux serveurs de son éditeur. ' +
          'Pour une dictée 100 % hors ligne, utilise l’application Android.',
    };
  }

  return {
    engine: 'clavier',
    available: false,
    offline: true,
    detail: 'Ce navigateur ne propose pas de dictée. Écris dans le champ : l’analyse est identique.',
  };
}

export interface DictationCallbacks {
  /** Texte en cours de reconnaissance (provisoire). */
  onPartial(text: string): void;
  /** Texte définitif, à l'arrêt. */
  onFinal(text: string): void;
  onError(message: string): void;
  /** Niveau sonore 0..1, pour animer le micro. */
  onLevel?(level: number): void;
}

export interface DictationSession {
  /** Termine la dictée et renvoie le texte complet. */
  stop(): Promise<string>;
  /** Abandonne sans rien renvoyer. */
  cancel(): Promise<void>;
}

const ERRORS: Record<string, string> = {
  'permission-microphone': 'Le micro est refusé. Autorise-le dans les réglages de l’application.',
  'moteur-absent': 'Aucun moteur de reconnaissance vocale sur cet appareil.',
  'rien-compris': 'Je n’ai rien compris. Parle un peu plus près du micro.',
  silence: 'Je n’ai rien entendu.',
  reseau: 'Le moteur a demandé le réseau. Télécharge le paquet français hors ligne pour t’en passer.',
  'reseau-delai': 'Le moteur a demandé le réseau. Télécharge le paquet français hors ligne pour t’en passer.',
  'moteur-occupe': 'Le moteur vocal est occupé. Réessaie dans un instant.',
  audio: 'Le micro n’a pas pu être lu.',
  'not-allowed': 'Le micro est refusé par le navigateur.',
  'service-not-allowed': 'Le navigateur refuse la reconnaissance vocale.',
  'no-speech': 'Je n’ai rien entendu.',
};

const humanError = (code: string) => ERRORS[code] ?? `Dictée interrompue (${code}).`;

/** Démarre une dictée. Lève une erreur si le micro n'est pas accordé. */
export async function startDictation(
  cb: DictationCallbacks,
  opts: { offlineOnly?: boolean } = {},
): Promise<DictationSession> {
  const offlineOnly = opts.offlineOnly ?? true;

  // ── Android natif ──
  if (isNative() && Capacitor.getPlatform() === 'android') {
    const perm = await Speech.requestMic();
    if (!perm.granted) throw new Error(humanError('permission-microphone'));

    const handles: PluginListenerHandle[] = [];
    let settled = false;
    let resolveFinal: ((text: string) => void) | null = null;

    handles.push(await Speech.addListener('partial', (d) => cb.onPartial(d.text ?? '')));
    handles.push(await Speech.addListener('level', (d) => cb.onLevel?.(d.level ?? 0)));
    handles.push(await Speech.addListener('final', (d) => {
      settled = true;
      cb.onFinal(d.text ?? '');
      resolveFinal?.(d.text ?? '');
    }));
    handles.push(await Speech.addListener('error', (d) => {
      if (settled) return;
      settled = true;
      cb.onError(humanError(String(d.text ?? 'inconnu')));
      resolveFinal?.('');
    }));

    const cleanup = async () => {
      for (const h of handles) {
        try { await h.remove(); } catch { /* déjà retiré */ }
      }
    };

    try {
      await Speech.start({ offlineOnly });
    } catch (e) {
      await cleanup();
      throw new Error(humanError(String((e as Error)?.message ?? 'inconnu').split(':')[0]));
    }

    return {
      async stop() {
        // `stop()` rend le texte accumulé ; l'événement 'final' arrive juste
        // après. On attend le premier des deux, borné, pour ne jamais rester
        // bloqué si le moteur ne répond pas.
        const viaEvent = new Promise<string>((resolve) => { resolveFinal = resolve; });
        const viaCall = Speech.stop().then((r) => r.text ?? '').catch(() => '');
        const timeout = new Promise<string>((resolve) => setTimeout(() => resolve(''), 3000));
        const first = await Promise.race([viaEvent, timeout]);
        const direct = await viaCall;
        await cleanup();
        // le plus complet des deux gagne
        return (direct.length >= first.length ? direct : first).trim();
      },
      async cancel() {
        try { await Speech.cancel(); } catch { /* rien à annuler */ }
        await cleanup();
      },
    };
  }

  // ── Web Speech API ──
  const Ctor = webRecognition();
  if (!Ctor) throw new Error('La dictée n’est pas disponible ici. Écris dans le champ — l’analyse est la même.');

  const rec = new Ctor();
  rec.lang = 'fr-FR';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = '';
  let stopped = false;
  let resolveFinal: ((text: string) => void) | null = null;

  rec.onresult = (event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const piece = result[0]?.transcript ?? '';
      if (result.isFinal) finalText = `${finalText} ${piece}`.trim();
      else interim = `${interim} ${piece}`.trim();
    }
    cb.onPartial(`${finalText} ${interim}`.trim());
  };
  rec.onerror = (event: any) => {
    const code = String(event?.error ?? 'inconnu');
    // un silence n'est pas une panne : la reconnaissance repart toute seule
    if (code === 'no-speech' || code === 'aborted') return;
    cb.onError(humanError(code));
  };
  rec.onend = () => {
    if (!stopped) {
      // Chrome coupe tout seul au bout d'un moment : on relance tant que
      // l'utilisateur n'a pas cliqué sur stop.
      try { rec.start(); return; } catch { /* le moteur refuse : on conclut */ }
    }
    cb.onFinal(finalText.trim());
    resolveFinal?.(finalText.trim());
  };

  try {
    rec.start();
  } catch (e) {
    throw new Error(humanError(String((e as Error)?.message ?? 'inconnu')));
  }

  return {
    stop() {
      stopped = true;
      const done = new Promise<string>((resolve) => { resolveFinal = resolve; });
      try { rec.stop(); } catch { resolveFinal?.(finalText.trim()); }
      const timeout = new Promise<string>((resolve) => setTimeout(() => resolve(finalText.trim()), 2500));
      return Promise.race([done, timeout]);
    },
    async cancel() {
      stopped = true;
      try { rec.abort(); } catch { /* déjà arrêté */ }
    },
  };
}

/** Ouvre les réglages système où se télécharge le paquet français hors ligne. */
export async function openVoiceSettings(): Promise<boolean> {
  if (!isNative() || Capacitor.getPlatform() !== 'android') return false;
  try {
    const res = await Speech.openSettings();
    return res.opened;
  } catch {
    return false;
  }
}
