// ── Podomètre ─────────────────────────────────────────────────────────────
// Deux sources possibles, et JAMAIS de trou entre les deux :
//
//  • Le service Android de premier plan (LennyxStepService) compte avec le
//    capteur MATÉRIEL, écran éteint et application fermée comprises. Quand il
//    tourne vraiment, il fait autorité et l'accéléromètre reste muet.
//
//  • Sinon — présence coupée, permission refusée, téléphone sans podomètre
//    matériel, ou simplement Windows/web — l'accéléromètre prend la main et
//    compte pendant que l'application est ouverte.
//
// ⚠ Régression corrigée en v0.7.1 : l'accéléromètre était coupé sur Android
// dès que la plateforme le permettait, alors que le service, lui, n'était
// démarré que si l'utilisateur avait activé la présence. Résultat : aucune
// source active, plus un seul pas compté. La bascule dépend désormais de
// l'état RÉEL du service, pas de la plateforme.

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Motion } from '@capacitor/motion';
import { useStore } from '../store/useStore';
import { backgroundSupported, nativeSteps, nativeCountingActive } from '../lib/background';

const PEAK_THRESHOLD = 1.4; // m/s² au-dessus de la gravité lissée
const MIN_STEP_MS = 280; // cadence max ~3.5 pas/s
const FLUSH_MS = 4000;
const NATIVE_POLL_MS = 20000;

export function useSteps() {
  const addSteps = useStore((s) => s.addSteps);
  const setNativeSteps = useStore((s) => s.setNativeSteps);
  const backgroundEnabled = useStore((s) => s.profile.background.enabled);

  // Optimiste au démarrage pour éviter que l'accéléromètre ne s'allume une
  // fraction de seconde alors que le service tourne déjà (double comptage).
  const [nativeActive, setNativeActive] = useState(() => backgroundSupported() && backgroundEnabled);

  const buffer = useRef(0);
  const avg = useRef(9.81);
  const lastStep = useRef(0);
  const above = useRef(false);

  // ── Qui compte, en vérité ? ─────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const active = await nativeCountingActive();
      if (alive) setNativeActive(active);
    };
    void refresh();
    // l'utilisateur peut couper le service depuis Android : on revérifie au retour
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [backgroundEnabled]);

  // ── Source 1 : le service natif (rapatriement des compteurs) ────────────
  useEffect(() => {
    if (!nativeActive) return;
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
  }, [nativeActive, setNativeSteps]);

  // ── Source 2 : l'accéléromètre, dès que le natif ne compte pas ──────────
  useEffect(() => {
    if (nativeActive) return;
    let removeListener: (() => void) | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

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
      if (stopped) return;
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
      stopped = true;
      buffer.current = 0;
    };
  }, [nativeActive, addSteps]);
}
