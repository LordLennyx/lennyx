// ── Réglages de la dictée vocale ──────────────────────────────────────────
// Le diagnostic est volontairement bavard : si la reconnaissance française
// hors ligne n'est pas installée, l'utilisateur doit SAVOIR quoi faire — et
// savoir que c'est gratuit.

import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { dictationStatus, openVoiceSettings, type DictationStatus } from '../lib/dictation';
import VoiceCapture from './VoiceCapture';
import { Icon } from './Icon';

export default function DictationSection() {
  const dictation = useStore((s) => s.profile.dictation);
  const setDictation = useStore((s) => s.setDictation);
  const [status, setStatus] = useState<DictationStatus | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let alive = true;
    void dictationStatus().then((s) => { if (alive) setStatus(s); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="card">
      <h3 style={{ marginBottom: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>
        Dictée vocale
      </h3>

      <p className="muted" style={{ marginBottom: 10 }}>
        Annonce tes quêtes, quotidiennes, notes et dépenses à voix haute : Lennyx écrit, comprend
        les paramètres (difficulté, jours, heure limite, rubrique, montant) et te montre le
        résultat avant de créer quoi que ce soit.
      </p>

      {status && (
        <div className="row" style={{ marginBottom: 10 }}>
          <span className="badge" style={{ color: status.available ? 'var(--success)' : 'var(--muted)' }}>
            <Icon name={status.available ? 'mic' : 'micOff'} size={13} />
            {status.available ? 'Micro disponible' : 'Micro indisponible'}
          </span>
          {status.offline && (
            <span className="badge" style={{ color: 'var(--success)' }}>
              <Icon name="lock" size={13} /> Hors ligne
            </span>
          )}
          {status.provider && (
            <span className="badge" style={{ color: 'var(--muted)' }} title="Moteur de reconnaissance du système">
              {status.provider}
            </span>
          )}
        </div>
      )}

      {status && <p className="muted" style={{ marginBottom: 10 }}>{status.detail}</p>}

      <label className="row" style={{ gap: 9, cursor: 'pointer', marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={dictation.offlineOnly}
          onChange={(e) => setDictation({ offlineOnly: e.target.checked })}
        />
        <span>
          Exiger la reconnaissance hors ligne
          <span className="muted"> — aucune donnée ne quitte l’appareil. Décoche seulement si
          ton téléphone n’a pas le paquet français hors connexion.</span>
        </span>
      </label>

      <div className="row">
        <button className="btn" onClick={() => setTesting(true)}>
          <Icon name="mic" size={13} /> Tester la dictée
        </button>
        {status?.engine === 'android' && (
          <button className="btn" onClick={() => void openVoiceSettings()}>
            <Icon name="gear" size={13} /> Paquets de langue
          </button>
        )}
      </div>

      {dictation.used > 0 && (
        <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          {dictation.used} dictée{dictation.used > 1 ? 's' : ''} déjà transformée{dictation.used > 1 ? 's' : ''} en tâches.
        </p>
      )}

      {testing && (
        <VoiceCapture
          heading="Test de la dictée"
          intro="Dis n’importe quoi — par exemple « crée une quête facile arroser les plantes demain »."
          onClose={() => setTesting(false)}
        />
      )}
    </div>
  );
}
