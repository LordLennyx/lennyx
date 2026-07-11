// ── Bande sonore générative de Lennyx : musique d'ambiance infinie ────────
// Aucun fichier audio : nappes, drones et mélodies pentatoniques générées en
// temps réel, avec réverbération par convolution (impulsion synthétisée).
// Trois ambiances : éther (calme), bravoure (épique), focus (minimal).

import { getCtx, getMasterBus } from './sound';

export type MusicMood = 'ether' | 'valor' | 'focus';

interface MoodDef {
  /** progressions d'accords (fréquences de base en Hz, ratios d'accord ajoutés) */
  chords: number[][];
  scale: number[]; // gamme pour la mélodie (Hz)
  chordDur: number; // secondes par accord
  padType: OscillatorType;
  padGain: number;
  melodyChance: number; // probabilité de note mélodique par battement
  melodyGain: number;
  drone?: number; // fréquence de bourdon grave
  pulse?: boolean; // pulsation rythmique grave (épique)
}

const A = 220;
const MOODS: Record<MusicMood, MoodDef> = {
  ether: {
    // la mineur : Am — F — C — G, doux et suspendu
    chords: [
      [A, A * 1.189, A * 1.498],       // Am (la do mi)
      [174.6, 220, 261.6],             // F  (fa la do)
      [130.8, 164.8, 196],             // C  (do mi sol)
      [196, 246.9, 293.7],             // G  (sol si ré)
    ],
    scale: [440, 523.3, 587.3, 659.3, 784, 880, 1046.5],
    chordDur: 9,
    padType: 'sine',
    padGain: 0.05,
    melodyChance: 0.3,
    melodyGain: 0.035,
  },
  valor: {
    // ré mineur héroïque : Dm — Bb — F — C, avec bourdon et pulsation
    chords: [
      [146.8, 174.6, 220],
      [116.5, 146.8, 174.6],
      [174.6, 220, 261.6],
      [130.8, 164.8, 196],
    ],
    scale: [293.7, 349.2, 392, 440, 523.3, 587.3],
    chordDur: 7,
    padType: 'sawtooth',
    padGain: 0.022,
    melodyChance: 0.42,
    melodyGain: 0.04,
    drone: 73.4,
    pulse: true,
  },
  focus: {
    // quintes ouvertes, presque immobile
    chords: [
      [110, 164.8],
      [98, 146.8],
      [110, 164.8],
      [123.5, 185],
    ],
    scale: [440, 493.9, 587.3, 659.3, 740],
    chordDur: 12,
    padType: 'triangle',
    padGain: 0.045,
    melodyChance: 0.14,
    melodyGain: 0.028,
  },
};

let running = false;
let mood: MusicMood = 'ether';
let bus: GainNode | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let melodyTimer: ReturnType<typeof setInterval> | null = null;
let chordIdx = 0;
let volume = 0.35;

/** Réverbération : impulsion de bruit décroissant (3 s). */
function makeReverb(c: AudioContext): ConvolverNode {
  const len = c.sampleRate * 3;
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
  }
  const conv = c.createConvolver();
  conv.buffer = buf;
  return conv;
}

function ensureBus(): GainNode | null {
  const c = getCtx();
  const master = getMasterBus();
  if (!c || !master) return null;
  if (!bus) {
    bus = c.createGain();
    bus.gain.value = volume;
    const reverb = makeReverb(c);
    const wet = c.createGain();
    wet.gain.value = 0.4;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    // tout converge vers le bus maître (effets + musique) : un seul limiteur, jamais de saturation
    bus.connect(lp);
    lp.connect(master);
    lp.connect(reverb);
    reverb.connect(wet).connect(master);
  }
  return bus;
}

function padNote(freq: number, dur: number, def: MoodDef) {
  const c = getCtx();
  const b = ensureBus();
  if (!c || !b) return;
  const t0 = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(def.padGain, t0 + dur * 0.3);
  g.gain.setValueAtTime(def.padGain, t0 + dur * 0.65);
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  g.connect(b);
  for (const det of [-6, 6]) {
    const o = c.createOscillator();
    o.type = def.padType;
    o.frequency.value = freq;
    o.detune.value = det;
    o.connect(g);
    o.start(t0);
    o.stop(t0 + dur + 0.1);
  }
}

function pluck(freq: number, gain: number) {
  const c = getCtx();
  const b = ensureBus();
  if (!c || !b) return;
  const t0 = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq;
  // profondeur FM modeste (fraction de la fondamentale) : un pluck cristallin, pas un grincement
  const mod = c.createOscillator();
  const mg = c.createGain();
  mod.frequency.value = freq * 2;
  mg.gain.setValueAtTime(freq * 0.15, t0);
  mg.gain.exponentialRampToValueAtTime(0.01, t0 + 0.8);
  mod.connect(mg).connect(o.frequency);
  o.connect(g).connect(b);
  o.start(t0);
  mod.start(t0);
  o.stop(t0 + 1.8);
  mod.stop(t0 + 1.8);
}

function pulseNote(freq: number) {
  const c = getCtx();
  const b = ensureBus();
  if (!c || !b) return;
  const t0 = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0.055, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 2, t0);
  o.frequency.exponentialRampToValueAtTime(freq, t0 + 0.4);
  o.connect(g).connect(b);
  o.start(t0);
  o.stop(t0 + 0.6);
}

function playChord() {
  if (!running) return;
  const def = MOODS[mood];
  const chord = def.chords[chordIdx % def.chords.length];
  chordIdx++;
  for (const f of chord) padNote(f, def.chordDur + 2, def);
  if (def.drone) padNote(def.drone, def.chordDur + 2, def);
  if (def.pulse) {
    for (let i = 0; i < def.chordDur; i += 1.75) {
      setTimeout(() => running && pulseNote(chord[0] / 2), i * 1000);
    }
  }
  timer = setTimeout(playChord, def.chordDur * 1000);
}

export function startMusic(m: MusicMood, vol: number) {
  mood = m;
  volume = vol;
  const c = getCtx();
  if (!c) return;
  const b = ensureBus();
  if (b) b.gain.setTargetAtTime(vol, c.currentTime, 0.4);
  if (running) return;
  running = true;
  chordIdx = 0;
  playChord();
  melodyTimer = setInterval(() => {
    if (!running) return;
    const def = MOODS[mood];
    if (Math.random() < def.melodyChance) {
      pluck(def.scale[Math.floor(Math.random() * def.scale.length)], def.melodyGain);
    }
  }, 1400);
}

export function stopMusic() {
  running = false;
  if (timer) clearTimeout(timer);
  if (melodyTimer) clearInterval(melodyTimer);
  timer = null;
  melodyTimer = null;
  const c = getCtx();
  if (bus && c) bus.gain.setTargetAtTime(0.0001, c.currentTime, 0.5);
}

export function setMusicMood(m: MusicMood) {
  mood = m;
  chordIdx = 0;
}

export function setMusicVolume(v: number) {
  volume = v;
  const c = getCtx();
  if (bus && c && running) bus.gain.setTargetAtTime(v, c.currentTime, 0.2);
}
