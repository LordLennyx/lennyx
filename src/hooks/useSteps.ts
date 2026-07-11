// ── Podomètre : détection de pas via l'accéléromètre ──────────────────────
// Android (Capacitor Motion) et navigateurs mobiles (devicemotion).
// Algorithme : magnitude de l'accélération → moyenne glissante (gravité) →
// détection de pics avec intervalle minimal. Compte tant que l'app est
// ouverte ; l'ajout manuel complète les périodes hors application.

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Motion } from '@capacitor/motion';
import { useStore } from '../store/useStore';

const PEAK_THRESHOLD = 1.4; // m/s² au-dessus de la gravité lissée
const MIN_STEP_MS = 280; // cadence max ~3.5 pas/s
const FLUSH_MS = 4000;

export function useSteps() {
  const addSteps = useStore((s) => s.addSteps);
  const buffer = useRef(0);
  const avg = useRef(9.81);
  const lastStep = useRef(0);
  const above = useRef(false);

  useEffect(() => {
    let removeNative: (() => void) | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;

    const onMagnitude = (m: number) => {
      // gravité lissée (filtre passe-bas très lent)
      avg.current = avg.current * 0.96 + m * 0.04;
      const delta = m - avg.current;
      const now = Date.now();
      if (delta > PEAK_THRESHOLD && !above.current) {
        above.current = true;
        if (now - lastStep.current > MIN_STEP_MS) {
          lastStep.current = now;
          buffer.current++;
        }
      } else if (delta < PEAK_THRESHOLD * 0.4) {
        above.current = false;
      }
    };

    const flush = () => {
      if (buffer.current > 0) {
        addSteps(buffer.current);
        buffer.current = 0;
      }
    };

    const start = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const h = await Motion.addListener('accel', (ev) => {
            const a = ev.accelerationIncludingGravity;
            if (a) onMagnitude(Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z));
          });
          removeNative = () => void h.remove();
        } else if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
          const handler = (ev: DeviceMotionEvent) => {
            const a = ev.accelerationIncludingGravity;
            if (a && a.x != null && a.y != null && a.z != null) {
              onMagnitude(Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z));
            }
          };
          window.addEventListener('devicemotion', handler);
          removeNative = () => window.removeEventListener('devicemotion', handler);
        }
        flushTimer = setInterval(flush, FLUSH_MS);
      } catch {
        /* pas de capteur : le module reste utilisable en manuel */
      }
    };
    void start();

    return () => {
      if (removeNative) removeNative();
      if (flushTimer) clearInterval(flushTimer);
      flush();
    };
  }, [addSteps]);
}
