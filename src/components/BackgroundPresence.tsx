// ── Réglage de la présence permanente (Android) ───────────────────────────
// Affiche aussi un diagnostic clair : sans lui, un podomètre muet ne donne
// aucune piste sur la cause (service coupé ? permission ? capteur absent ?).

import { useEffect, useState } from 'react';
import { useStore, stepsOn } from '../store/useStore';
import { todayStr } from '../game/engine';
import { Icon } from './Icon';
import {
  backgroundSupported, startBackground, stopBackground, backgroundStatus,
  requestBatteryExemption, sensorLabel, type BackgroundStatus,
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
        // le service reprend le compteur du jour là où il en est
        const st = useStore.getState();
        const res = await startBackground(stepsOn(st.profile, todayStr()));
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
  // Le service a-t-il vraiment démarré ? S'il n'a pas choisi de capteur alors
  // que le téléphone en propose un, c'est qu'il n'a jamais tourné — le cas le
  // plus trompeur, car tout semble activé côté réglages.
  const serviceMute = !!status?.enabled && status.sensor === 'none' && status.available !== 'none';
  const heartbeatAge = status?.heartbeat ? Date.now() - status.heartbeat : 0;
  const staleService = !!status?.enabled && heartbeatAge > 30 * 60_000;

  const askExemption = async () => {
    await requestBatteryExemption();
    // Le réglage se fait dans un écran système : on relit à son retour.
    setTimeout(() => void refresh(), 1200);
  };

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
            Capteur disponible : {sensorLabel(status.available)}
          </div>
          <div>
            <Icon name={status.permission ? 'check' : 'close'} size={11} />{' '}
            Permission d'activité physique {status.permission ? 'accordée' : 'non accordée'}
          </div>
          <div>
            <Icon name={status.enabled ? 'check' : 'close'} size={11} />{' '}
            Service en arrière-plan {status.enabled ? 'actif' : 'arrêté'}
          </div>
          <div>
            <Icon name={status.batteryExempt ? 'check' : 'warning'} size={11} />{' '}
            Mise en veille par le système{' '}
            {status.batteryExempt ? 'désactivée' : 'ENCORE ACTIVE — c’est ce qui coupe le comptage'}
          </div>
          {status.enabled && (
            <div>
              <Icon name={status.heartbeat > 0 ? 'heart' : 'warning'} size={11} />{' '}
              {status.heartbeat > 0
                ? `Dernier signe de vie du service à ${new Date(status.heartbeat).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Le service n’a encore rien mesuré'}
            </div>
          )}
          <div style={{ marginTop: 6, color: 'var(--text)' }}>
            Source du comptage :{' '}
            <strong style={{ color: reallyCounting ? 'var(--success)' : 'var(--gold)' }}>
              {reallyCounting
                ? `${sensorLabel(status.sensor)}, en continu`
                : 'accéléromètre, application ouverte'}
            </strong>
          </div>
        </div>
      )}

      {/* L'exemption de batterie est la première cause de comptage muet sur
          Samsung/Xiaomi/Huawei : on la met en avant, bouton compris. */}
      {status && !status.batteryExempt && (
        <div style={{ marginTop: 10 }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Ton téléphone est autorisé à endormir Lennyx : dès que l'écran s'éteint, le service
            est tué et les pas cessent d'être comptés. Cette autorisation est la seule qui l'en
            empêche — c'est aussi elle qui permet au Pomodoro et au réveil de tenir.
          </p>
          <button className="btn" onClick={() => void askExemption()}>
            <Icon name="shield" size={14} /> Empêcher la mise en veille de Lennyx
          </button>
        </div>
      )}

      {serviceMute && (
        <p className="muted" style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>
          Le service est marqué actif mais n'a jamais choisi de capteur : Android l'a
          probablement arrêté. Coupe puis réactive la présence ci-dessus.
        </p>
      )}
      {staleService && !serviceMute && (
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Aucun relevé depuis plus d'une demi-heure. Si tu as marché entre-temps, c'est que le
          système a suspendu Lennyx : accorde-lui l'exemption de veille ci-dessus.
        </p>
      )}
      {noSensor && (
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Cet appareil n'expose aucun capteur de mouvement : le comptage se fera à la main.
        </p>
      )}
      {permissionMissing && !noSensor && (
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Sans la permission « activité physique », Android interdit le comptage en arrière-plan.
          Tu peux l'accorder depuis les réglages du système (Applications → Lennyx → Autorisations).
        </p>
      )}
    </div>
  );
}
