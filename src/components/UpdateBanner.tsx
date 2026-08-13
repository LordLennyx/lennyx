// ── « Une nouvelle version est prête » ────────────────────────────────────
// Une application installée peut rester des semaines sur le même code : rien
// ne l'oblige à recharger. Le service worker signale qu'une version attend,
// et on laisse l'utilisateur choisir son moment — jamais de rechargement
// imposé au milieu d'une saisie.

import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export default function UpdateBanner() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onReady = () => setReady(true);
    window.addEventListener('lennyx-update-ready', onReady);
    return () => window.removeEventListener('lennyx-update-ready', onReady);
  }, []);

  if (!ready) return null;

  const apply = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      // La version en attente ne prend la main que si on l'y invite ;
      // `controllerchange` nous dit qu'elle a pris le relais.
      if (reg?.waiting) {
        navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
        reg.waiting.postMessage({ type: 'lennyx-skip-waiting' });
        return;
      }
    } catch {
      /* on recharge quand même */
    }
    window.location.reload();
  };

  return (
    <div
      className="card"
      style={{
        position: 'fixed', left: 16, right: 16, zIndex: 130,
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        maxWidth: 460, margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: 12,
        borderColor: 'color-mix(in srgb, var(--gold) 40%, var(--border))',
      }}
    >
      <Icon name="sparkle" size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
      <div className="grow">
        <div style={{ fontWeight: 700, fontSize: 14 }}>Une nouvelle version de Lennyx est prête</div>
        <div className="muted" style={{ fontSize: 12.5 }}>Tes données ne bougent pas.</div>
      </div>
      <button className="btn small" onClick={() => setReady(false)}>Plus tard</button>
      <button className="btn small primary" onClick={() => void apply()}>Recharger</button>
    </div>
  );
}
