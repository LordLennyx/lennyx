// ── Explosion de particules à la complétion d'une tâche ───────────────────
import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

interface P {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  color: string; kind: string; rot: number; vr: number; ch?: string;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#c9a227';
}

const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

export default function BurstFX() {
  const ref = useRef<HTMLCanvasElement>(null);
  const parts = useRef<P[]>([]);
  const raf = useRef(0);
  const fxEvent = useStore((s) => s.fxEvent);
  const style = useStore((s) => s.profile.burstFx);
  const motionOn = useStore((s) => s.profile.motionOn);

  useEffect(() => {
    if (!fxEvent || !motionOn || style === 'none') return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const accent = cssVar('--accent');
    const accent2 = cssVar('--accent2');
    const gold = cssVar('--gold');
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const { x, y } = fxEvent;

    const spawn = (kind: string) => {
      if (kind === 'burst-sparks') {
        for (let i = 0; i < 26; i++) {
          const ang = rand(0, 6.28), sp = rand(2, 7);
          parts.current.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.5, life: 0, maxLife: rand(24, 44), size: rand(1, 2.4), color: Math.random() < 0.4 ? gold : accent2, kind, rot: 0, vr: 0 });
        }
      } else if (kind === 'burst-gold') {
        for (let i = 0; i < 20; i++) {
          parts.current.push({ x: x + rand(-8, 8), y: y - rand(0, 10), vx: rand(-2, 2), vy: rand(-6.5, -2.5), life: 0, maxLife: rand(40, 65), size: rand(2, 4), color: gold, kind, rot: rand(0, 6.28), vr: rand(-0.2, 0.2) });
        }
      } else if (kind === 'burst-glyphs') {
        for (let i = 0; i < 12; i++) {
          const ang = rand(0, 6.28), sp = rand(0.8, 2.6);
          parts.current.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.8, life: 0, maxLife: rand(40, 70), size: rand(11, 17), color: Math.random() < 0.5 ? accent : accent2, kind, rot: rand(-0.4, 0.4), vr: rand(-0.03, 0.03), ch: RUNES[Math.floor(rand(0, RUNES.length))] });
        }
      } else if (kind === 'burst-shards') {
        for (let i = 0; i < 18; i++) {
          const ang = rand(0, 6.28), sp = rand(2.5, 6.5);
          parts.current.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, maxLife: rand(26, 46), size: rand(3, 7), color: [accent, accent2, gold][Math.floor(rand(0, 3))], kind, rot: rand(0, 6.28), vr: rand(-0.3, 0.3) });
        }
      } else if (kind === 'burst-nova') {
        parts.current.push({ x, y, vx: 0, vy: 0, life: 0, maxLife: 34, size: 0, color: gold, kind: 'ring', rot: 0, vr: 0 });
        parts.current.push({ x, y, vx: 0, vy: 0, life: 0, maxLife: 22, size: 0, color: accent2, kind: 'ring', rot: 0, vr: 0 });
        for (let i = 0; i < 34; i++) {
          const ang = rand(0, 6.28), sp = rand(3, 9);
          parts.current.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, maxLife: rand(28, 52), size: rand(1.2, 3), color: Math.random() < 0.5 ? gold : accent, kind: 'burst-sparks', rot: 0, vr: 0 });
        }
      }
    };
    spawn(style);

    cancelAnimationFrame(raf.current);
    const w = window.innerWidth, h = window.innerHeight;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      parts.current = parts.current.filter((p) => p.life < p.maxLife);
      for (const p of parts.current) {
        p.life++;
        const k = 1 - p.life / p.maxLife;
        ctx.globalAlpha = Math.max(0, k);
        if (p.kind === 'ring') {
          const r = (p.life / p.maxLife) * (p.color === cssVar('--gold') ? 90 : 55);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.5 * k;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, 6.28);
          ctx.stroke();
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.kind === 'burst-gold' ? 0.28 : 0.12;
        p.vx *= 0.985;
        p.rot += p.vr;
        ctx.fillStyle = p.color;
        if (p.kind === 'burst-glyphs' && p.ch) {
          ctx.font = `${p.size}px serif`;
          ctx.fillText(p.ch, p.x, p.y);
        } else if (p.kind === 'burst-shards') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.6, p.size * 0.6);
          ctx.lineTo(-p.size * 0.6, p.size * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (p.kind === 'burst-gold') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, 6.28);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, 6.28);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (parts.current.length > 0) raf.current = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    raf.current = requestAnimationFrame(tick);
  }, [fxEvent, style, motionOn]);

  return <canvas ref={ref} className="fx-canvas" />;
}
