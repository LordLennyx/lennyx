// Petits sons synthétisés (WebAudio) — aucun fichier audio nécessaire.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function note(freq: number, start: number, dur: number, gain = 0.08) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.05);
}

export type SoundKind = 'complete' | 'levelup' | 'buy' | 'achievement' | 'fail';

export function playSound(kind: SoundKind, enabled: boolean) {
  if (!enabled) return;
  switch (kind) {
    case 'complete':
      note(659, 0, 0.12);
      note(880, 0.09, 0.18);
      break;
    case 'levelup':
      note(523, 0, 0.15);
      note(659, 0.12, 0.15);
      note(784, 0.24, 0.15);
      note(1047, 0.36, 0.35, 0.1);
      break;
    case 'achievement':
      note(784, 0, 0.12);
      note(988, 0.1, 0.12);
      note(1175, 0.2, 0.25);
      break;
    case 'buy':
      note(440, 0, 0.1);
      note(660, 0.08, 0.15);
      break;
    case 'fail':
      note(220, 0, 0.2);
      note(180, 0.15, 0.3);
      break;
  }
}
