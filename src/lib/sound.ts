// ── Moteur audio de Lennyx v2 : synthèse pure WebAudio, zéro fichier ──────
// Sons superposés (couches d'oscillateurs, FM, bruit filtré) + compresseur
// maître. Le volume global est piloté par les réglages du profil.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

const prefs = { volume: 0.7 };

export function setSoundPrefs(p: { volume: number }) {
  prefs.volume = p.volume;
  if (master && ctx) master.gain.setTargetAtTime(prefs.volume, ctx.currentTime, 0.05);
}

export function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      // léger lissage des aigus pour éviter toute agressivité résiduelle
      const smooth = ctx.createBiquadFilter();
      smooth.type = 'lowpass';
      smooth.frequency.value = 11000;
      smooth.Q.value = 0.4;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 18;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;
      master = ctx.createGain();
      master.gain.value = prefs.volume;
      master.connect(smooth).connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function out(): GainNode | null {
  return getCtx() ? master : null;
}

/** Bus maître partagé (effets + musique) : tout passe par le même limiteur. */
export function getMasterBus(): GainNode | null {
  return getCtx() ? master : null;
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  slideTo?: number; // glissando vers cette fréquence
  detune?: number; // 2e oscillateur désaccordé (largeur)
  fm?: { ratio: number; depth: number }; // synthèse FM (cloches)
  pan?: number;
}

/** Une note synthétisée, riche : couche principale + détune + FM optionnelle. */
function tone(freq: number, start: number, dur: number, o: ToneOpts = {}) {
  const c = getCtx();
  const m = out();
  if (!c || !m) return;
  const t0 = c.currentTime + start;
  const g = c.createGain();
  const gain = o.gain ?? 0.09;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  let dest: AudioNode = g;
  if (o.pan !== undefined) {
    const p = c.createStereoPanner();
    p.pan.value = o.pan;
    g.connect(p).connect(m);
    dest = g;
  } else {
    g.connect(m);
  }

  const mkOsc = (f: number, det = 0) => {
    const osc = c.createOscillator();
    osc.type = o.type ?? 'triangle';
    osc.frequency.setValueAtTime(f, t0);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
    if (det) osc.detune.value = det;
    if (o.fm) {
      // Profondeur de modulation exprimée en fraction de la fondamentale (0.12 = shimmer
      // discret). Les anciennes valeurs (>1×) faisaient passer la fréquence instantanée en
      // négatif — d'où les grincements métalliques signalés.
      const mod = c.createOscillator();
      const mg = c.createGain();
      mod.frequency.value = f * o.fm.ratio;
      const peak = f * o.fm.depth * 0.12;
      mg.gain.setValueAtTime(peak, t0);
      mg.gain.exponentialRampToValueAtTime(Math.max(peak * 0.02, 0.001), t0 + dur);
      mod.connect(mg).connect(osc.frequency);
      mod.start(t0);
      mod.stop(t0 + dur + 0.05);
    }
    osc.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  };
  mkOsc(freq);
  if (o.detune) mkOsc(freq, o.detune);
}

/** Souffle percussif (bruit blanc filtré) pour le punch. Q plafonné pour éviter le sifflement. */
function noiseHit(start: number, dur: number, freq: number, gain = 0.05, q = 6) {
  const c = getCtx();
  const m = out();
  if (!c || !m) return;
  const t0 = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = Math.min(q, 4.5);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(freq * 1.6, 9000);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(lp).connect(g).connect(m);
  src.start(t0);
}

export type SoundKind =
  | 'complete' | 'levelup' | 'buy' | 'achievement' | 'fail'
  | 'record' | 'perfect' | 'oracle'
  | 'notify' | 'sentinel' | 'briefing' | 'celebrate';

export function playSound(kind: SoundKind, enabled: boolean) {
  if (!enabled || prefs.volume <= 0) return;
  switch (kind) {
    case 'complete': // pluck ascendant + poussière d'étoiles
      noiseHit(0, 0.06, 2600, 0.035);
      tone(523, 0, 0.14, { type: 'triangle', gain: 0.08, detune: 6 });
      tone(784, 0.07, 0.16, { type: 'triangle', gain: 0.09, detune: 6 });
      tone(1047, 0.14, 0.3, { type: 'sine', gain: 0.07, fm: { ratio: 2, depth: 1.2 } });
      break;
    case 'record': // glissando héroïque
      tone(392, 0, 0.5, { type: 'sawtooth', gain: 0.04, slideTo: 784, detune: 8 });
      tone(784, 0.32, 0.35, { type: 'triangle', gain: 0.09, fm: { ratio: 2, depth: 1.5 } });
      tone(1175, 0.44, 0.4, { type: 'sine', gain: 0.06 });
      noiseHit(0.32, 0.2, 3200, 0.03, 3);
      break;
    case 'perfect': // arpège de harpe (journée parfaite)
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
        tone(f, i * 0.07, 0.5, { type: 'triangle', gain: 0.055, fm: { ratio: 3, depth: 0.8 }, pan: -0.4 + i * 0.16 }),
      );
      break;
    case 'levelup': // fanfare cuivrée
      tone(392, 0, 0.16, { type: 'sawtooth', gain: 0.05, detune: 10 });
      tone(523, 0.13, 0.16, { type: 'sawtooth', gain: 0.055, detune: 10 });
      tone(659, 0.26, 0.16, { type: 'sawtooth', gain: 0.06, detune: 10 });
      tone(784, 0.39, 0.55, { type: 'sawtooth', gain: 0.07, detune: 12 });
      tone(1047, 0.39, 0.55, { type: 'triangle', gain: 0.05 });
      noiseHit(0.39, 0.35, 4500, 0.03, 2);
      break;
    case 'achievement': // carillon FM lumineux
      tone(880, 0, 0.35, { type: 'sine', gain: 0.07, fm: { ratio: 2.4, depth: 2.5 } });
      tone(1175, 0.12, 0.4, { type: 'sine', gain: 0.06, fm: { ratio: 2.4, depth: 2 } });
      tone(1760, 0.24, 0.5, { type: 'sine', gain: 0.05, fm: { ratio: 3.1, depth: 1.5 } });
      break;
    case 'buy': // tintement de pièces
      noiseHit(0, 0.04, 5200, 0.05, 10);
      tone(1319, 0.02, 0.12, { type: 'sine', gain: 0.06, fm: { ratio: 4.2, depth: 1.2 } });
      tone(1760, 0.09, 0.18, { type: 'sine', gain: 0.05, fm: { ratio: 4.2, depth: 1 } });
      break;
    case 'fail': // chute mineure sourde
      tone(220, 0, 0.28, { type: 'sawtooth', gain: 0.045, slideTo: 165, detune: 8 });
      tone(147, 0.2, 0.4, { type: 'triangle', gain: 0.06 });
      noiseHit(0, 0.1, 300, 0.04, 2);
      break;
    case 'oracle': // nappe mystique
      tone(330, 0, 0.7, { type: 'sine', gain: 0.035, detune: 5, attack: 0.15 });
      tone(495, 0.1, 0.7, { type: 'sine', gain: 0.03, detune: 5, attack: 0.2 });
      tone(660, 0.2, 0.8, { type: 'sine', gain: 0.028, attack: 0.25 });
      break;
    case 'notify': // double carillon net (rappel)
      tone(988, 0, 0.16, { type: 'sine', gain: 0.09, fm: { ratio: 2, depth: 1.5 } });
      tone(1319, 0.16, 0.28, { type: 'sine', gain: 0.08, fm: { ratio: 2, depth: 1.2 } });
      break;
    case 'sentinel': // alerte grave et posée
      tone(440, 0, 0.2, { type: 'square', gain: 0.035 });
      tone(440, 0.28, 0.2, { type: 'square', gain: 0.035 });
      tone(349, 0.56, 0.35, { type: 'triangle', gain: 0.06 });
      break;
    case 'briefing': // trille douce du matin
      [659, 784, 988, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.16, { type: 'triangle', gain: 0.055 }));
      break;
    case 'celebrate': // gerbe scintillante
      [1047, 1319, 1568, 2093].forEach((f, i) =>
        tone(f, i * 0.06, 0.35, { type: 'sine', gain: 0.05, fm: { ratio: 3, depth: 1 }, pan: -0.3 + i * 0.2 }),
      );
      noiseHit(0, 0.25, 6000, 0.03, 1.5);
      break;
  }
}
