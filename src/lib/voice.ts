// ── La voix de l'Oracle : synthèse vocale multi-plateforme ────────────────
// Android : plugin natif @capacitor-community/text-to-speech.
// Windows / Web : Web Speech API (voix système, sélectionnables).

import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

export interface VoiceOption {
  uri: string;
  label: string;
}

const isNative = () => Capacitor.isNativePlatform();

let webVoices: SpeechSynthesisVoice[] = [];

function refreshWebVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  webVoices = speechSynthesis.getVoices();
}

if (typeof speechSynthesis !== 'undefined') {
  refreshWebVoices();
  speechSynthesis.onvoiceschanged = refreshWebVoices;
}

/** Voix disponibles (françaises d'abord). */
export async function listVoices(): Promise<VoiceOption[]> {
  try {
    if (isNative()) {
      const { voices } = await TextToSpeech.getSupportedVoices();
      return voices
        .map((v, i) => ({ uri: String(i), label: `${v.name}${v.lang ? ` (${v.lang})` : ''}`, lang: v.lang ?? '' }))
        .filter((v) => v.lang.toLowerCase().startsWith('fr') || v.lang === '')
        .slice(0, 25)
        .map(({ uri, label }) => ({ uri, label }));
    }
    refreshWebVoices();
    const fr = webVoices.filter((v) => v.lang.toLowerCase().startsWith('fr'));
    const list = (fr.length > 0 ? fr : webVoices).slice(0, 25);
    return list.map((v) => ({ uri: v.voiceURI, label: `${v.name} (${v.lang})` }));
  } catch {
    return [];
  }
}

export interface SpeakOpts {
  voiceURI: string;
  rate: number;
  pitch: number;
}

let speaking = false;

export async function speak(text: string, opts: SpeakOpts): Promise<void> {
  // on nettoie le texte des puces et symboles pour une lecture fluide
  const clean = text.replace(/[•*_#`]/g, '').replace(/\n+/g, '. ').replace(/\s{2,}/g, ' ');
  try {
    await stopSpeaking();
    speaking = true;
    if (isNative()) {
      const voiceIdx = opts.voiceURI ? Number(opts.voiceURI) : undefined;
      await TextToSpeech.speak({
        text: clean,
        lang: 'fr-FR',
        rate: opts.rate,
        pitch: opts.pitch,
        volume: 1,
        ...(voiceIdx !== undefined && !Number.isNaN(voiceIdx) ? { voice: voiceIdx } : {}),
      });
      speaking = false;
      return;
    }
    if (typeof speechSynthesis === 'undefined') return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'fr-FR';
    u.rate = opts.rate;
    u.pitch = opts.pitch;
    refreshWebVoices();
    const v = webVoices.find((x) => x.voiceURI === opts.voiceURI);
    if (v) u.voice = v;
    u.onend = () => { speaking = false; };
    u.onerror = () => { speaking = false; };
    speechSynthesis.speak(u);
  } catch {
    speaking = false;
  }
}

export async function stopSpeaking(): Promise<void> {
  try {
    if (isNative()) await TextToSpeech.stop();
    else if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  } catch {
    /* silencieux */
  }
  speaking = false;
}

export function isSpeaking(): boolean {
  return speaking;
}
