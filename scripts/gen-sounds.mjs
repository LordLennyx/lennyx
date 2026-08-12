// Génère les sonneries de notification Android (res/raw/*.wav).
//
// Aucun fichier audio n'est importé dans le projet : tout est synthétisé ici,
// exactement dans le même esprit que le moteur WebAudio de l'application. Un
// canal de notification Android exige un fichier réel, d'où ce pré-rendu.
//
// Règle héritée du bug v0.5 : la profondeur de modulation FM reste une petite
// fraction de la porteuse, sinon la fréquence instantanée passe en négatif et
// produit des grincements métalliques.

import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 44100;

function writeWav(path, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
}

/** Une note : porteuse + détune léger + FM douce, enveloppe percussive. */
function note(buf, { freq, start, dur, gain = 0.5, type = 'triangle', fm = 0, detune = 0, slideTo = 0 }) {
  const startIdx = Math.floor(start * RATE);
  const len = Math.floor(dur * RATE);
  const attack = Math.max(1, Math.floor(0.008 * RATE));
  const wave = (phase) => {
    switch (type) {
      case 'sine': return Math.sin(phase);
      case 'square': return Math.sin(phase) >= 0 ? 0.7 : -0.7;
      case 'saw': return (((phase / (2 * Math.PI)) % 1) * 2 - 1) * 0.8;
      default: return Math.asin(Math.sin(phase)) * (2 / Math.PI); // triangle
    }
  };
  for (let i = 0; i < len; i++) {
    const idx = startIdx + i;
    if (idx >= buf.length) break;
    const t = i / RATE;
    const progress = i / len;
    // enveloppe : attaque courte puis décroissance exponentielle
    const env = i < attack ? i / attack : Math.pow(1 - progress, 2.2);
    const f = slideTo ? freq + (slideTo - freq) * progress : freq;
    // FM discrète : 12 % de la porteuse au maximum, décroissante
    const mod = fm > 0 ? Math.sin(2 * Math.PI * f * 2 * t) * f * fm * 0.12 * (1 - progress) : 0;
    const phase = 2 * Math.PI * (f + mod) * t;
    let sample = wave(phase);
    if (detune) sample = (sample + wave(2 * Math.PI * (f * (1 + detune / 1200)) * t)) * 0.5;
    buf[idx] += sample * env * gain;
  }
}

/** Souffle percussif filtré, pour le relief. */
function noise(buf, { start, dur, gain = 0.15, cutoff = 0.35 }) {
  const startIdx = Math.floor(start * RATE);
  const len = Math.floor(dur * RATE);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const idx = startIdx + i;
    if (idx >= buf.length) break;
    const env = Math.pow(1 - i / len, 3);
    const white = Math.random() * 2 - 1;
    last = last + cutoff * (white - last); // passe-bas simple
    buf[idx] += last * env * gain;
  }
}

function render(seconds, build) {
  const buf = new Float32Array(Math.ceil(seconds * RATE));
  build(buf);
  // normalisation douce + limiteur, pour un rendu homogène entre sonneries
  let peak = 0;
  for (const s of buf) peak = Math.max(peak, Math.abs(s));
  if (peak > 0) {
    const scale = Math.min(1 / peak, 1.6) * 0.85;
    for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * scale);
  }
  return buf;
}

const SOUNDS = {
  // Rappel standard : double carillon clair, ni stressant ni discret
  notif_reminder: render(1.2, (b) => {
    note(b, { freq: 988, start: 0, dur: 0.22, gain: 0.6, type: 'sine', fm: 1.2 });
    note(b, { freq: 1319, start: 0.18, dur: 0.5, gain: 0.5, type: 'sine', fm: 1 });
  }),

  // Urgence : trois impulsions montantes, on sent le temps filer
  notif_urgent: render(1.5, (b) => {
    for (let i = 0; i < 3; i++) {
      note(b, { freq: 880 + i * 220, start: i * 0.22, dur: 0.2, gain: 0.55, type: 'square' });
      noise(b, { start: i * 0.22, dur: 0.08, gain: 0.1, cutoff: 0.6 });
    }
    note(b, { freq: 1568, start: 0.7, dur: 0.55, gain: 0.5, type: 'sine', fm: 1.4 });
  }),

  // Dernier appel : chute grave, la fenêtre s'est refermée
  notif_lastcall: render(1.6, (b) => {
    note(b, { freq: 330, start: 0, dur: 0.45, gain: 0.5, type: 'saw', slideTo: 220, detune: 8 });
    note(b, { freq: 220, start: 0.35, dur: 0.7, gain: 0.5, type: 'triangle', slideTo: 165 });
    noise(b, { start: 0, dur: 0.25, gain: 0.12, cutoff: 0.15 });
  }),

  // Sentinelle du soir : deux coups posés, presque solennels
  notif_sentinel: render(1.8, (b) => {
    note(b, { freq: 440, start: 0, dur: 0.3, gain: 0.45, type: 'square' });
    note(b, { freq: 440, start: 0.38, dur: 0.3, gain: 0.45, type: 'square' });
    note(b, { freq: 349, start: 0.76, dur: 0.7, gain: 0.5, type: 'triangle', detune: 6 });
  }),

  // Briefing du matin : trille lumineuse
  notif_briefing: render(1.4, (b) => {
    [659, 784, 988, 784, 1175].forEach((f, i) =>
      note(b, { freq: f, start: i * 0.11, dur: 0.3, gain: 0.45, type: 'triangle', fm: 0.8 }),
    );
  }),

  // Célébration : gerbe scintillante ascendante
  notif_celebrate: render(1.8, (b) => {
    [1047, 1319, 1568, 2093].forEach((f, i) =>
      note(b, { freq: f, start: i * 0.08, dur: 0.5, gain: 0.45, type: 'sine', fm: 1 }),
    );
    note(b, { freq: 784, start: 0, dur: 0.9, gain: 0.3, type: 'triangle', detune: 10 });
    noise(b, { start: 0, dur: 0.4, gain: 0.08, cutoff: 0.8 });
  }),

  // Relance insistante (mode Duolingo) : motif répété, volontairement collant
  notif_nag: render(2.2, (b) => {
    for (let i = 0; i < 4; i++) {
      const t = i * 0.42;
      note(b, { freq: 1175, start: t, dur: 0.16, gain: 0.5, type: 'square' });
      note(b, { freq: 880, start: t + 0.14, dur: 0.18, gain: 0.45, type: 'square' });
    }
  }),
};

const OUT = 'android/app/src/main/res/raw';
mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(SOUNDS)) {
  writeWav(`${OUT}/${name}.wav`, samples);
}
console.log(`${Object.keys(SOUNDS).length} sonneries générées dans ${OUT}`);
