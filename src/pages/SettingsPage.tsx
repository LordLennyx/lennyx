import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';

export default function SettingsPage() {
  const { profile, setName, toggleSound, resetAll, importSave, pushToast, quests, dailies } =
    useStore();
  const lastReconcile = useStore((s) => s.lastReconcile);
  const [name, setNameLocal] = useState(profile.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportSave = () => {
    const data = JSON.stringify({ profile, quests, dailies, lastReconcile }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lennyx-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('💾', 'Sauvegarde exportée !', 'info');
  };

  const onImportFile = async (f: File) => {
    const ok = importSave(await f.text());
    pushToast(ok ? '📥' : '❌', ok ? 'Sauvegarde importée !' : 'Fichier de sauvegarde invalide', ok ? 'info' : 'warn');
  };

  return (
    <div>
      <h2 className="page-title">⚙️ Réglages</h2>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Profil</h3>
        <div className="row">
          <input
            className="input grow"
            value={name}
            maxLength={24}
            onChange={(e) => setNameLocal(e.target.value)}
            placeholder="Ton nom d'aventurier"
          />
          <button className="btn primary" onClick={() => setName(name)}>
            Enregistrer
          </button>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          L'avatar et le thème se changent dans 🏆 Récompenses → Boutique.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Sons</h3>
        <button className="btn" onClick={toggleSound}>
          {profile.soundOn ? '🔊 Sons activés' : '🔇 Sons coupés'}
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Sauvegarde</h3>
        <p className="muted" style={{ marginBottom: 10 }}>
          Tes données restent sur cet appareil. Exporte-les pour les transférer entre ton PC et ton
          téléphone (la synchro automatique par QR code arrive dans une future version 😉).
        </p>
        <div className="row">
          <button className="btn" onClick={exportSave}>
            💾 Exporter la sauvegarde
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            📥 Importer une sauvegarde
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--danger) 40%, var(--border))' }}>
        <h3 style={{ marginBottom: 10, color: 'var(--danger)' }}>Zone dangereuse</h3>
        {confirmReset ? (
          <div className="row">
            <span className="muted">Tout effacer ? XP, quêtes, succès… irréversible !</span>
            <button
              className="btn danger"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
              }}
            >
              Oui, tout effacer
            </button>
            <button className="btn" onClick={() => setConfirmReset(false)}>
              Annuler
            </button>
          </div>
        ) : (
          <button className="btn danger" onClick={() => setConfirmReset(true)}>
            🗑️ Réinitialiser toutes les données
          </button>
        )}
      </div>

      <p className="muted" style={{ marginTop: 18, textAlign: 'center' }}>
        ⚔️ Lennyx v0.1.0 — ton aventure, tes règles.
      </p>
    </div>
  );
}
