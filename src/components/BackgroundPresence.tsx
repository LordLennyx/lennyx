// ── Réglage de la présence permanente (Android) ───────────────────────────
import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from './Icon';
import { backgroundSupported, startBackground, stopBackground, backgroundStatus } from '../lib/background';

export default function BackgroundPresence({ compact = false }: { compact?: boolean }) {
  const background = useStore((s) => s.profile.background);
  const setBackground = useStore((s) => s.setBackground);
  const pushToast = useStore((s) => s.pushToast);
  const [busy, setBusy] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);

  const supported = backgroundSupported();

  useEffect(() => {
    if (!supported) return;
    void backgroundStatus().then((st) => {
      setLastUpdate(st.lastUpdate);
      // l'état réel du service fait foi (l'utilisateur a pu le couper depuis Android)
      if (st.enabled !== background.enabled) setBackground({ enabled: st.enabled });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (background.enabled) {
        await stopBackground();
        setBackground({ enabled: false });
        pushToast('moon', 'Présence permanente désactivée', 'info');
      } else {
        const res = await startBackground();
        if (res.running) {
          setBackground({ enabled: true, askedOnce: true });
          pushToast('check', 'Lennyx veille désormais en permanence', 'info');
        } else {
          setBackground({ askedOnce: true });
          pushToast(
            'warning',
            res.denied
              ? "Permission d'activité refusée — impossible de compter les pas en arrière-plan"
              : 'Impossible de démarrer la présence permanente',
            'warn',
          );
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    if (compact) return null;
    return (
      <div className="card">
        <h3 style={{ marginBottom: 8, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>
          Présence permanente
        </h3>
        <p className="muted">
          Disponible sur Android uniquement : un service système y compte tes pas et veille sur
          tes quêtes en continu, application fermée et écran éteint. Sur cet appareil, le
          comptage n'a lieu que pendant que Lennyx est ouvert.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'card ornate'}>
      {!compact && (
        <h3 style={{ marginBottom: 8, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>
          Présence permanente
        </h3>
      )}
      <p className="muted" style={{ marginBottom: 10 }}>
        Lennyx devient un habitant du téléphone : le capteur de pas matériel tourne en continu —
        écran éteint, application fermée, et même après un redémarrage. Une notification discrète
        et silencieuse reste affichée : c'est Android qui l'exige pour autoriser ce fonctionnement.
      </p>
      <div className="row">
        <button className="btn primary" onClick={toggle} disabled={busy}>
          <Icon name={background.enabled ? 'check' : 'bolt'} size={14} />
          {background.enabled ? 'Présence active' : 'Activer la présence permanente'}
        </button>
        {background.enabled && (
          <span className="badge">
            <Icon name="heart" size={11} style={{ color: 'var(--success)' }} />
            {lastUpdate > 0 ? `dernier relevé ${new Date(lastUpdate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'en veille'}
          </span>
        )}
      </div>
      {background.enabled && (
        <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Si Android coupe malgré tout le service, désactive l'optimisation de batterie pour
          Lennyx dans les réglages du système (Batterie → Non restreinte).
        </p>
      )}
    </div>
  );
}
