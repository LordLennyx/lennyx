import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';

export default function SettingsPage() {
  const { profile, setName, toggleSound, toggleMotion, resetAll, importSave, pushToast, quests, dailies, oracleMessages } = useStore();
  const lastReconcile = useStore((s) => s.lastReconcile);
  const [name, setNameLocal] = useState(profile.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportSave = () => {
    const data = JSON.stringify({ profile, quests, dailies, oracleMessages, lastReconcile }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lennyx-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('download', 'Sauvegarde exportée', 'info');
  };

  const onImportFile = async (f: File) => {
    const ok = importSave(await f.text());
    pushToast(ok ? 'upload' : 'warning', ok ? 'Sauvegarde importée' : 'Fichier de sauvegarde invalide', ok ? 'info' : 'warn');
  };

  return (
    <div>
      <h2 className="page-title">Réglages</h2>
      <p className="page-sub">Ton sanctuaire, tes règles.</p>

      <div className="card">
        <h3 style={{ marginBottom: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>Identité</h3>
        <div className="row">
          <input
            className="input grow"
            value={name}
            maxLength={24}
            onChange={(e) => setNameLocal(e.target.value)}
            placeholder="Ton nom d'aventurier"
          />
          <button className="btn primary" onClick={() => setName(name)}>Enregistrer</button>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          Sigil, titre, thème et effets se choisissent dans Récompenses.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>Ambiance</h3>
        <div className="row">
          <button className="btn" onClick={toggleSound}>
            <Icon name={profile.soundOn ? 'check' : 'close'} size={13} /> Sons {profile.soundOn ? 'activés' : 'coupés'}
          </button>
          <button className="btn" onClick={toggleMotion}>
            <Icon name={profile.motionOn ? 'check' : 'close'} size={13} /> Animations {profile.motionOn ? 'activées' : 'coupées'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>Sauvegarde</h3>
        <p className="muted" style={{ marginBottom: 10 }}>
          Tes données restent sur cet appareil. Exporte-les pour les transférer entre ton PC et ton téléphone.
        </p>
        <div className="row">
          <button className="btn" onClick={exportSave}>
            <Icon name="download" size={14} /> Exporter
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={14} /> Importer
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
        <h3 style={{ marginBottom: 10, color: 'var(--danger)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>
          Zone dangereuse
        </h3>
        {confirmReset ? (
          <div className="row">
            <span className="muted">Tout effacer ? XP, quêtes, succès… irréversible.</span>
            <button className="btn danger" onClick={() => { resetAll(); setConfirmReset(false); }}>
              Oui, tout effacer
            </button>
            <button className="btn" onClick={() => setConfirmReset(false)}>Annuler</button>
          </div>
        ) : (
          <button className="btn danger" onClick={() => setConfirmReset(true)}>
            <Icon name="trash" size={14} /> Réinitialiser toutes les données
          </button>
        )}
      </div>

      <p className="muted" style={{ marginTop: 20, textAlign: 'center', letterSpacing: '0.15em', fontSize: 11 }}>
        LENNYX v0.2.0 — ORDRE &amp; GLOIRE
      </p>
    </div>
  );
}
