// ── Fond ambiant animé (canvas plein écran, très léger) ───────────────────
import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#c9a227';
}

type Particle = { x: number; y: number; vx: number; vy: number; r: number; a: number; p: number };

export default function Ambient() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mode = useStore((s) => (s.profile.motionOn ? s.profile.ambientFx : 'none'));
  const theme = useStore((s) => s.profile.theme);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || mode === 'none') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const accent = cssVar('--accent');
    const accent2 = cssVar('--accent2');
    const gold = cssVar('--gold');

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    let parts: Particle[] = [];
    const glyphs = 'アイウエオカキクケコサシスセソ01<>[]{}#$%&*+=?';
    let cols: number[] = [];

    const init = () => {
      parts = [];
      if (mode === 'dust') {
        for (let i = 0; i < 45; i++)
          parts.push({ x: rand(0, w), y: rand(0, h), vx: rand(-0.08, 0.08), vy: rand(-0.05, 0.05), r: rand(0.6, 1.8), a: rand(0.08, 0.3), p: rand(0, 6.28) });
      } else if (mode === 'stars') {
        for (let i = 0; i < 90; i++)
          parts.push({ x: rand(0, w), y: rand(0, h), vx: 0, vy: 0, r: rand(0.4, 1.6), a: rand(0.1, 0.6), p: rand(0, 6.28) });
      } else if (mode === 'embers') {
        for (let i = 0; i < 36; i++)
          parts.push({ x: rand(0, w), y: rand(0, h), vx: rand(-0.12, 0.12), vy: rand(-0.5, -0.18), r: rand(0.8, 2.2), a: rand(0.15, 0.5), p: rand(0, 6.28) });
      } else if (mode === 'void') {
        for (let i = 0; i < 5; i++)
          parts.push({ x: w / 2, y: h / 2, vx: 0, vy: 0, r: (i / 5) * Math.max(w, h) * 0.6, a: 0.3, p: i });
      } else if (mode === 'matrix') {
        const n = Math.floor(w / 22);
        cols = Array.from({ length: n }, () => rand(-h, 0));
      }
    };
    init();

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      if (mode === 'dust' || mode === 'stars') {
        for (const p of parts) {
          p.x = (p.x + p.vx + w) % w;
          p.y = (p.y + p.vy + h) % h;
          const tw = 0.55 + 0.45 * Math.sin(t * (mode === 'stars' ? 1.6 : 0.7) + p.p);
          ctx.globalAlpha = p.a * tw;
          ctx.fillStyle = Math.random() < 0.06 ? gold : accent2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.28);
          ctx.fill();
        }
      } else if (mode === 'embers') {
        for (const p of parts) {
          p.x += p.vx + Math.sin(t + p.p) * 0.15;
          p.y += p.vy;
          if (p.y < -6) { p.y = h + 6; p.x = rand(0, w); }
          ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 2 + p.p));
          ctx.fillStyle = Math.random() < 0.5 ? gold : accent;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.28);
          ctx.fill();
        }
      } else if (mode === 'aurora') {
        for (let i = 0; i < 3; i++) {
          const cx = w * (0.25 + 0.25 * i) + Math.sin(t * 0.2 + i * 2) * w * 0.12;
          const cy = h * 0.28 + Math.cos(t * 0.15 + i) * h * 0.1;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.42);
          g.addColorStop(0, (i % 2 ? accent2 : accent) + '22');
          g.addColorStop(1, 'transparent');
          ctx.globalAlpha = 1;
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
      } else if (mode === 'void') {
        const m = Math.max(w, h) * 0.7;
        for (const p of parts) {
          p.r += 0.25;
          if (p.r > m) p.r = 1;
          ctx.globalAlpha = 0.14 * (1 - p.r / m);
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, p.r, 0, 6.28);
          ctx.stroke();
        }
      } else if (mode === 'matrix') {
        ctx.font = '13px monospace';
        for (let i = 0; i < cols.length; i++) {
          cols[i] += 2.4;
          if (cols[i] > h + 40) cols[i] = -rand(0, h * 0.5);
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = accent2;
          ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * 22 + 6, cols[i]);
          ctx.globalAlpha = 0.12;
          for (let k = 1; k < 7; k++)
            ctx.fillText(glyphs[Math.floor((t * 10 + i + k) % glyphs.length)], i * 22 + 6, cols[i] - k * 16);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [mode, theme]);

  if (mode === 'none') return null;
  return <canvas ref={ref} className="ambient-canvas" />;
}
