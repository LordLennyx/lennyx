// ── Podomètre ─────────────────────────────────────────────────────────────
// Deux régimes selon la plateforme :
//
//  • Android : le service de premier plan (LennyxStepService) compte avec le
//    capteur MATÉRIEL, écran éteint et application fermée comprises. Il fait
//    autorité : on se contente de rapatrier ses compteurs. Aucun comptage
//    JavaScript, donc aucun risque de double comptage.
//
//  • Web / Windows : pas de service possible — on retombe sur l'accéléromètre,
//    qui ne compte que pendant que l'application est ouverte.

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Motion } from '@capacitor/motion';
import { useStore } from '../store/useStore';
import { backgroundSupported, nativeSteps } from '../lib/background';

const PEAK_THRESHOLD = 1.4; // m/s² au-dessus de la gravité lissée
const MIN_STEP_MS = 280; // cadence max ~3.5 pas/s
const FLUSH_MS = 4000;
const NATIVE_POLL_MS = 20000;

export function useSteps() {
  const addSteps = useStore((s) => s.addSteps);
  const setNativeSteps = useStore((s) => s.setNativeSteps);
  const buffer = useRef(0);
  const avg = useRef(9.81);
  const lastStep = useRef(0);
  const above = useRef(false);

  // ── Android : le service natif fait autorité ────────────────────────────
  useEffect(() => {
    if (!backgroundSupported()) return;
    let alive = true;
    const sync = async () => {
      const days = await nativeSteps();
      if (alive && Object.keys(days).length > 0) setNativeSteps(days);
    };
    void sync();
    const iv = setInterval(sync, NATIVE_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [setNativeSteps]);

  // ── Web / Windows : accéléromètre, application ouverte seulement ────────
  useEffect(() => {
    if (backgroundSupported()) return; // surtout pas en double sur Android
    let removeListener: (() => void) | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;

    const onMagnitude = (m: number) => {
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
          removeListener = () => void h.remove();
        } else if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
          const handler = (ev: DeviceMotionEvent) => {
            const a = ev.accelerationIncludingGravity;
            if (a && a.x != null && a.y != null && a.z != null) {
              onMagnitude(Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z));
            }
          };
          window.addEventListener('devicemotion', handler);
          removeListener = () => window.removeEventListener('devicemotion', handler);
        }
        flushTimer = setInterval(flush, FLUSH_MS);
      } catch {
        /* pas de capteur : le module reste utilisable en manuel */
      }
    };
    void start();

    return () => {
      if (removeListener) removeListener();
      if (flushTimer) clearInterval(flushTimer);
      flush();
    };
  }, [addSteps]);
}
