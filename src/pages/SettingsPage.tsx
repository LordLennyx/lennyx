import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import SyncSection from '../components/SyncSection';
import { ensurePermission, permissionState, isNative } from '../lib/notify';
import { playSound } from '../lib/sound';
import type { MusicMood } from '../lib/music';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ marginBottom: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>
      {children}
    </h3>
  );
}

const MOODS: Array<{ id: MusicMood; label: string; desc: string }> = [
  { id: 'ether', label: 'Éther', desc: 'nappes calmes' },
  { id: 'valor', label: 'Bravoure', desc: 'souffle épique' },
  { id: 'focus', label: 'Focus', desc: 'minimal, concentration' },
];

export default function SettingsPage() {
  const {
    profile, setName, toggleSound, toggleMotion, setAudio, setNotify,
    resetAll, importSave, pushToast, quests, dailies, oracleMessages,
  } = useStore();
  const lastReconcile = useStore((s) => s.lastReconcile);
  const [name, setNameLocal] = useState(profile.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const perm = permissionState();

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

  const askPermission = async () => {
    const ok = await ensurePermission();
    pushToast(ok ? 'check' : 'warning', ok ? 'Notifications autorisées' : 'Permission refusée par le système', ok ? 'info' : 'warn');
  };

  return (
    <div>
      <h2 className="page-title">Réglages</h2>
      <p className="page-sub">Ton sanctuaire, tes règles.</p>

      <div className="card">
        <SectionTitle>Identité</SectionTitle>
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
        <SectionTitle>Audio</SectionTitle>
        <div className="row" style={{ marginBottom: 12 }}>
          <button className="btn" onClick={toggleSound}>
            <Icon name={profile.soundOn ? 'check' : 'close'} size={13} /> Effets sonores {profile.soundOn ? 'activés' : 'coupés'}
          </button>
          <button className="btn small" onClick={() => playSound('complete', profile.soundOn)}>
            Tester
          </button>
        </div>
        <label className="row" style={{ gap: 12 }}>
          <span className="muted" style={{ width: 130 }}>Volume des effets</span>
          <input
            type="range" min="0" max="1" step="0.05" className="grow"
            value={profile.audio.volume}
            onChange={(e) => setAudio({ volume: Number(e.target.value) })}
            onMouseUp={() => playSound('buy', profile.soundOn)}
          />
          <span className="muted" style={{ width: 38, textAlign: 'right' }}>{Math.round(profile.audio.volume * 100)}%</span>
        </label>

        <div style={{ borderTop: '1px solid var(--border)', margin: '14px 0' }} />

        <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={profile.audio.music} onChange={(e) => setAudio({ music: e.target.checked })} />
          <div>
            <div style={{ fontWeight: 700 }}>Bande sonore d'ambiance</div>
            <div className="muted">Musique générative infinie, composée en direct par l'application.</div>
          </div>
        </label>
        {profile.audio.music && (
          <>
            <div className="row" style={{ marginTop: 10 }}>
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  className={`chip ${profile.audio.mood === m.id ? 'on' : ''}`}
                  onClick={() => setAudio({ mood: m.id })}
                  title={m.desc}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <label className="row" style={{ gap: 12, marginTop: 10 }}>
              <span className="muted" style={{ width: 130 }}>Volume musique</span>
              <input
                type="range" min="0" max="0.8" step="0.05" className="grow"
                value={profile.audio.musicVolume}
                onChange={(e) => setAudio({ musicVolume: Number(e.target.value) })}
              />
              <span className="muted" style={{ width: 38, textAlign: 'right' }}>{Math.round((profile.audio.musicVolume / 0.8) * 100)}%</span>
            </label>
          </>
        )}
      </div>

      <div className="card">
        <SectionTitle>Notifications</SectionTitle>
        <label className="row" style={{ gap: 10, cursor: 'pointer', marginBottom: 12 }}>
          <input type="checkbox" checked={profile.notify.enabled} onChange={(e) => setNotify({ enabled: e.target.checked })} />
          <div>
            <div style={{ fontWeight: 700 }}>Activer les notifications</div>
            <div className="muted">
              {isNative()
                ? 'Sur Android, les rappels sonnent même application fermée.'
                : 'Sur PC, les rappels arrivent tant que Lennyx est ouvert.'}
            </div>
          </div>
        </label>

        {profile.notify.enabled && (
          <>
            {perm !== 'granted' && perm !== 'unsupported' && (
              <div className="row" style={{ marginBottom: 12 }}>
                <button className="btn primary small" onClick={askPermission}>
                  <Icon name="warning" size={13} /> Autoriser les notifications système
                </button>
                {perm === 'denied' && <span className="muted">(refusées — à réactiver dans les réglages du système)</span>}
              </div>
            )}

            <label className="row" style={{ gap: 10, marginBottom: 10 }}>
              <span className="muted" style={{ width: 210 }}>Rappel des chronométrées</span>
              <select
                className="input" style={{ width: 170 }}
                value={profile.notify.lead}
                onChange={(e) => setNotify({ lead: Number(e.target.value) })}
              >
                <option value={0}>Désactivé</option>
                <option value={5}>5 min avant</option>
                <option value={15}>15 min avant</option>
                <option value={30}>30 min avant</option>
                <option value={60}>1 h avant</option>
              </select>
            </label>

            <label className="row" style={{ gap: 10, cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={profile.notify.lastCall} onChange={(e) => setNotify({ lastCall: e.target.checked })} />
              <span>Ultime rappel à l'heure limite</span>
            </label>

            <label className="row" style={{ gap: 10, marginBottom: 10 }}>
              <span className="muted" style={{ width: 210 }}>Briefing du matin</span>
              <input
                type="time" className="input" style={{ width: 120 }}
                value={profile.notify.briefingTime}
                onChange={(e) => setNotify({ briefingTime: e.target.value })}
              />
              <button className="btn small" onClick={() => setNotify({ briefingTime: '' })} disabled={!profile.notify.briefingTime}>
                Désactiver
              </button>
            </label>

            <label className="row" style={{ gap: 10, marginBottom: 10 }}>
              <span className="muted" style={{ width: 210 }}>Sentinelle du soir</span>
              <input
                type="time" className="input" style={{ width: 120 }}
                value={profile.notify.sentinelTime}
                onChange={(e) => setNotify({ sentinelTime: e.target.value })}
              />
              <button className="btn small" onClick={() => setNotify({ sentinelTime: '' })} disabled={!profile.notify.sentinelTime}>
                Désactiver
              </button>
            </label>

            <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={profile.notify.celebrate} onChange={(e) => setNotify({ celebrate: e.target.checked })} />
              <span>Célébrations (niveaux, records, journées parfaites)</span>
            </label>
          </>
        )}
      </div>

      <SyncSection />

      <div className="card">
        <SectionTitle>Animations</SectionTitle>
        <button className="btn" onClick={toggleMotion}>
          <Icon name={profile.motionOn ? 'check' : 'close'} size={13} /> Animations {profile.motionOn ? 'activées' : 'coupées'}
        </button>
      </div>

      <div className="card">
        <SectionTitle>Sauvegarde</SectionTitle>
        <p className="muted" style={{ marginBottom: 10 }}>
          Tes données restent sur cet appareil. La synchronisation réseau ci-dessus ou l'export
          JSON permettent de les transférer.
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
        LENNYX v0.3.0 — ORDRE &amp; GLOIRE
      </p>
    </div>
  );
}
