// ── Réglage de la présence permanente (Android) ───────────────────────────
// Affiche aussi un diagnostic clair : sans lui, un podomètre muet ne donne
// aucune piste sur la cause (service coupé ? permission ? capteur absent ?).

import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from './Icon';
import {
  backgroundSupported, startBackground, stopBackground, backgroundStatus, type BackgroundStatus,
} from '../lib/background';

export default function BackgroundPresence({ compact = false }: { compact?: boolean }) {
  const background = useStore((s) => s.profile.background);
  const setBackground = useStore((s) => s.setBackground);
  const pushToast = useStore((s) => s.pushToast);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<BackgroundStatus | null>(null);

  const supported = backgroundSupported();

  const refresh = async () => {
    if (!supported) return;
    const st = await backgroundStatus();
    setStatus(st);
    // l'état réel du service fait foi (l'utilisateur a pu le couper depuis Android)
    if (st.enabled !== background.enabled) setBackground({ enabled: st.enabled });
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (background.enabled) {
        await stopBackground();
        setBackground({ enabled: false });
        pushToast('moon', 'Présence permanente désactivée — le comptage reprendra à l’ouverture', 'info');
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
              ? "Permission d'activité refusée — le comptage se limitera à l'application ouverte"
              : 'Impossible de démarrer la présence permanente',
            'warn',
          );
        }
      }
      await refresh();
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
          Réservée à Android : un service système y compte les pas et veille sur tes quêtes en
          continu, application fermée et écran éteint. Ici, le comptage a lieu pendant que
          Lennyx est ouvert.
        </p>
      </div>
    );
  }

  const noSensor = status !== null && !status.hasStepSensor;
  const permissionMissing = status !== null && !status.permission;
  const reallyCounting = !!status?.enabled && !!status?.permission && !!status?.hasStepSensor;

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
        <button className="btn primary" onClick={toggle} disabled={busy || noSensor}>
          <Icon name={background.enabled ? 'check' : 'bolt'} size={14} />
          {background.enabled ? 'Présence active' : 'Activer la présence permanente'}
        </button>
        {status && (
          <span className="badge" title="Dernier relevé transmis par le service">
            <Icon
              name={reallyCounting ? 'heart' : 'warning'}
              size={11}
              style={{ color: reallyCounting ? 'var(--success)' : 'var(--danger)' }}
            />
            {reallyCounting
              ? status.lastUpdate > 0
                ? `relevé ${new Date(status.lastUpdate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : 'en attente du premier pas'
              : 'comptage limité'}
          </span>
        )}
      </div>

      {/* Diagnostic : on ne laisse jamais l'utilisateur deviner */}
      {status && (
        <div className="muted" style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.7 }}>
          <div>
            <Icon name={status.hasStepSensor ? 'check' : 'close'} size={11} />{' '}
            Podomètre matériel {status.hasStepSensor ? 'détecté' : 'absent de cet appareil'}
          </div>
          <div>
            <Icon name={status.permission ? 'check' : 'close'} size={11} />{' '}
            Permission d'activité physique {status.permission ? 'accordée' : 'non accordée'}
          </div>
          <div>
            <Icon name={status.enabled ? 'check' : 'close'} size={11} />{' '}
            Service en arrière-plan {status.enabled ? 'actif' : 'arrêté'}
          </div>
          <div style={{ marginTop: 6, color: 'var(--text)' }}>
            Source du comptage :{' '}
            <strong style={{ color: reallyCounting ? 'var(--success)' : 'var(--gold)' }}>
              {reallyCounting ? 'capteur matériel, en continu' : 'accéléromètre, application ouverte'}
            </strong>
          </div>
        </div>
      )}

      {noSensor && (
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Cet appareil n'a pas de podomètre matériel : Lennyx compte alors les pas à
          l'accéléromètre pendant que l'application est ouverte, et tu peux compléter à la main.
        </p>
      )}
      {permissionMissing && !noSensor && (
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Sans la permission « activité physique », Android interdit le comptage en arrière-plan.
          Tu peux l'accorder depuis les réglages du système (Applications → Lennyx → Autorisations).
        </p>
      )}
      {reallyCounting && (
        <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Si Android coupe malgré tout le service, désactive l'optimisation de batterie pour
          Lennyx dans les réglages du système (Batterie → Non restreinte).
        </p>
      )}
    </div>
  );
}
