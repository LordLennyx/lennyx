// ── Podomètre ─────────────────────────────────────────────────────────────
// Deux sources tournent EN PARALLÈLE, et c'est volontaire :
//
//  • Le service Android (LennyxStepService) compte avec le capteur MATÉRIEL,
//    écran éteint et application fermée comprises. C'est lui qui donne les
//    grands totaux de la journée.
//
//  • L'accéléromètre compte pendant que l'application est ouverte. Il sert de
//    filet : téléphone sans podomètre matériel, permission refusée, service
//    arrêté par le constructeur, capteur silencieux…
//
// Aucun risque de double comptage : les deux mesurent la même marche et
// `stepsOn` retient le MAXIMUM des deux, jamais leur somme.
//
// ⚠ Historique à ne pas répéter : en v0.7.0 l'accéléromètre était coupé dès
// que la plateforme était Android alors que le service, lui, n'était pas
// démarré — plus aucune source. En v0.7.1 les deux sources partageaient un
// même compteur, et le service (qui repart de zéro) devait « rattraper »
// l'accéléromètre avant que le total ne bouge. D'où la séparation stricte.

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Motion } from '@capacitor/motion';
import { useStore } from '../store/useStore';
import { backgroundSupported, nativeSteps } from '../lib/background';

const PEAK_THRESHOLD = 1.4; // m/s² au-dessus de la gravité lissée
const MIN_STEP_MS = 280; // cadence max ~3.5 pas/s
const FLUSH_MS = 4000;
const NATIVE_POLL_MS = 15000;

export function useSteps() {
  const addSteps = useStore((s) => s.addSteps);
  const setNativeSteps = useStore((s) => s.setNativeSteps);
  const backgroundEnabled = useStore((s) => s.profile.background.enabled);

  const buffer = useRef(0);
  const avg = useRef(9.81);
  const lastStep = useRef(0);
  const above = useRef(false);

  // ── Source 1 : le service natif (rapatriement des compteurs) ────────────
  useEffect(() => {
    if (!backgroundSupported()) return;
    let alive = true;
    const sync = async () => {
      const days = await nativeSteps();
      if (alive && Object.keys(days).length > 0) setNativeSteps(days);
    };
    void sync();
    const iv = setInterval(sync, NATIVE_POLL_MS);
    // au retour dans l'application, on rapatrie tout de suite ce qui a été
    // marché pendant qu'elle était fermée
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [setNativeSteps, backgroundEnabled]);

  // ── Source 2 : l'accéléromètre, tant que l'application est ouverte ──────
  useEffect(() => {
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
