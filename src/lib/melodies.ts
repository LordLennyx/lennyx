// ── Galerie de mélodies : réveils et berceuses 100 % synthétisés ──────────
// Chaque mélodie est une séquence de notes jouée en boucle par WebAudio.
// L'utilisateur peut aussi importer son propre fichier audio ('custom'),
// stocké en base64 dans localStorage (clé lennyx-custom-audio).

import { getCtx } from './sound';

interface Note {
  f: number; // fréquence (0 = silence)
  d: number; // durée en battements
}

interface MelodyDef {
  id: string;
  name: string;
  kind: 'wake' | 'lullaby';
  bpm: number;
  type: OscillatorType;
  notes: Note[];
}

const C4 = 261.6, D4 = 293.7, E4 = 329.6, F4 = 349.2, G4 = 392, A4 = 440, B4 = 493.9;
const C5 = 523.3, D5 = 587.3, E5 = 659.3, F5 = 698.5, G5 = 784, A5 = 880;
const C3 = 130.8, G3 = 196, A3 = 220, E3 = 164.8, F3 = 174.6;

export const MELODIES: MelodyDef[] = [
  {
    id: 'aube', name: 'Aube dorée', kind: 'wake', bpm: 132, type: 'triangle',
    notes: [
      { f: C5, d: 1 }, { f: E5, d: 1 }, { f: G5, d: 1 }, { f: C5, d: 1 },
      { f: E5, d: 1 }, { f: G5, d: 1 }, { f: A5, d: 2 }, { f: G5, d: 2 },
      { f: E5, d: 1 }, { f: C5, d: 1 }, { f: D5, d: 2 }, { f: 0, d: 2 },
    ],
  },
  {
    id: 'fanfare', name: 'Fanfare du conquérant', kind: 'wake', bpm: 120, type: 'sawtooth',
    notes: [
      { f: G4, d: 1 }, { f: G4, d: 1 }, { f: G4, d: 1 }, { f: C5, d: 3 },
      { f: E5, d: 1 }, { f: D5, d: 1 }, { f: C5, d: 1 }, { f: G5, d: 3 },
      { f: 0, d: 2 },
    ],
  },
  {
    id: 'carillon', name: 'Carillon du beffroi', kind: 'wake', bpm: 100, type: 'sine',
    notes: [
      { f: C5, d: 2 }, { f: G4, d: 2 }, { f: A4, d: 2 }, { f: E5, d: 2 },
      { f: D5, d: 2 }, { f: G4, d: 2 }, { f: C5, d: 4 }, { f: 0, d: 2 },
    ],
  },
  {
    id: 'cristal', name: 'Éclat de cristal', kind: 'wake', bpm: 150, type: 'square',
    notes: [
      { f: E5, d: 1 }, { f: 0, d: 1 }, { f: E5, d: 1 }, { f: 0, d: 1 },
      { f: G5, d: 1 }, { f: E5, d: 1 }, { f: C5, d: 2 },
      { f: D5, d: 1 }, { f: E5, d: 1 }, { f: F5, d: 2 }, { f: 0, d: 3 },
    ],
  },
  {
    id: 'tambour', name: 'Appel du tambour', kind: 'wake', bpm: 160, type: 'triangle',
    notes: [
      { f: C4, d: 1 }, { f: C4, d: 1 }, { f: G4, d: 2 }, { f: C4, d: 1 },
      { f: C4, d: 1 }, { f: A4, d: 2 }, { f: G4, d: 1 }, { f: E4, d: 1 },
      { f: C5, d: 3 }, { f: 0, d: 2 },
    ],
  },
  {
    id: 'lune', name: 'Berceuse lunaire', kind: 'lullaby', bpm: 60, type: 'sine',
    notes: [
      { f: E4, d: 2 }, { f: G4, d: 2 }, { f: B4, d: 3 }, { f: A4, d: 1 },
      { f: G4, d: 2 }, { f: E4, d: 4 }, { f: D4, d: 2 }, { f: E4, d: 5 }, { f: 0, d: 3 },
    ],
  },
  {
    id: 'brume', name: 'Brume du soir', kind: 'lullaby', bpm: 52, type: 'triangle',
    notes: [
      { f: A3, d: 3 }, { f: C4, d: 3 }, { f: E4, d: 4 }, { f: D4, d: 2 },
      { f: C4, d: 3 }, { f: A3, d: 5 }, { f: 0, d: 4 },
    ],
  },
  {
    id: 'ete', name: 'Nuit d’été', kind: 'lullaby', bpm: 66, type: 'sine',
    notes: [
      { f: C4, d: 2 }, { f: E4, d: 2 }, { f: G4, d: 2 }, { f: E4, d: 2 },
      { f: F4, d: 2 }, { f: D4, d: 2 }, { f: C4, d: 4 },
      { f: G3, d: 2 }, { f: C4, d: 5 }, { f: 0, d: 3 },
    ],
  },
  {
    id: 'astres', name: 'Chœur des astres', kind: 'lullaby', bpm: 48, type: 'sine',
    notes: [
      { f: E3, d: 4 }, { f: G3, d: 4 }, { f: C4, d: 6 }, { f: 0, d: 2 },
      { f: F3, d: 4 }, { f: A3, d: 4 }, { f: C4, d: 6 }, { f: 0, d: 3 },
    ],
  },
];

export const CUSTOM_AUDIO_KEY = 'lennyx-custom-audio';

let loopTimer: ReturnType<typeof setTimeout> | null = null;
let gainNode: GainNode | null = null;
let audioEl: HTMLAudioElement | null = null;
let playing = false;

function playSequence(def: MelodyDef, volume: number) {
  const c = getCtx();
  if (!c || !playing) return;
  if (!gainNode) {
    gainNode = c.createGain();
    gainNode.connect(c.destination);
  }
  gainNode.gain.value = volume;
  const beat = 60 / def.bpm;
  let t = c.currentTime + 0.05;
  for (const n of def.notes) {
    const dur = n.d * beat;
    if (n.f > 0) {
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(def.kind === 'lullaby' ? 0.5 : 0.8, t + Math.min(0.05, dur * 0.2));
      g.gain.setValueAtTime(def.kind === 'lullaby' ? 0.5 : 0.8, t + dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      g.connect(gainNode);
      for (const det of def.kind === 'lullaby' ? [0] : [-5, 5]) {
        const o = c.createOscillator();
        o.type = def.type;
        o.frequency.value = n.f;
        o.detune.value = det;
        o.connect(g);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    }
    t += dur;
  }
  const total = (t - c.currentTime) * 1000;
  loopTimer = setTimeout(() => playSequence(def, volume), total + 400);
}

/**
 * Joue l'extrait choisi par l'utilisateur, en boucle sur la seule portion
 * délimitée — l'équivalent web de ce que fait LennyxAlarmService sur Android,
 * pour que le réveil de Windows sonne exactement pareil.
 */
export function playSegment(blob: Blob, startMs: number, endMs: number, volume: number) {
  stopMelody();
  playing = true;
  try {
    audioEl = new Audio(URL.createObjectURL(blob));
    audioEl.volume = Math.min(1, volume);
    audioEl.currentTime = startMs / 1000;
    const el = audioEl;
    el.ontimeupdate = () => {
      if (endMs > startMs && el.currentTime * 1000 >= endMs) el.currentTime = startMs / 1000;
    };
    // Filet : si la fin de l'extrait coïncide avec la fin du fichier, la
    // relance par ontimeupdate n'a pas le temps de se produire.
    el.onended = () => { el.currentTime = startMs / 1000; void el.play(); };
    void el.play();
  } catch {
    playing = false;
  }
}

/** Joue une mélodie en boucle (ou le fichier importé si id === 'custom'). */
export function playMelody(id: string, volume: number) {
  stopMelody();
  playing = true;
  if (id === 'custom') {
    try {
      const data = localStorage.getItem(CUSTOM_AUDIO_KEY);
      if (!data) { playing = false; return; }
      audioEl = new Audio(data);
      audioEl.loop = true;
      audioEl.volume = Math.min(1, volume);
      void audioEl.play();
    } catch {
      playing = false;
    }
    return;
  }
  const def = MELODIES.find((m) => m.id === id) ?? MELODIES[0];
  playSequence(def, volume);
}

export function stopMelody() {
  playing = false;
  if (loopTimer) clearTimeout(loopTimer);
  loopTimer = null;
  if (gainNode) gainNode.gain.value = 0;
  if (audioEl) {
    audioEl.pause();
    audioEl = null;
  }
}

export function isMelodyPlaying(): boolean {
  return playing;
}
