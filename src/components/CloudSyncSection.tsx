// ── Sauvegarde cloud (v0.6) : compte perso, chiffrement local, Supabase gratuit ──
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from './Icon';
import { encryptText, decryptText, isEncryptedPayload } from '../lib/crypto';
import { signUp, signIn, signOut, currentUserEmail, pushSave, pullSave, SETUP_SQL } from '../lib/cloudSync';

function currentSaveJson(): string {
  const s = useStore.getState();
  return JSON.stringify({
    profile: s.profile, quests: s.quests, dailies: s.dailies,
    oracleConversations: s.oracleConversations, activeConversationId: s.activeConversationId,
    timeLog: s.timeLog, notes: s.notes, transactions: s.transactions, lastReconcile: s.lastReconcile,
  });
}

export default function CloudSyncSection() {
  const cloudSync = useStore((s) => s.profile.cloudSync);
  const setCloudSync = useStore((s) => s.setCloudSync);
  const importSave = useStore((s) => s.importSave);
  const pushToast = useStore((s) => s.pushToast);

  const [url, setUrl] = useState(cloudSync.url);
  const [anonKey, setAnonKey] = useState(cloudSync.anonKey);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [confirmPull, setConfirmPull] = useState<{ payload: string; updatedAt: number } | null>(null);

  const configured = !!(cloudSync.url && cloudSync.anonKey);
  const ready = configured && !!passphrase;

  const saveConnection = () => {
    setCloudSync({ url: url.trim(), anonKey: anonKey.trim() });
    pushToast('check', 'Connexion cloud enregistrée', 'info');
  };

  const doSignUp = async () => {
    setBusy(true);
    const r = await signUp(cloudSync.url, cloudSync.anonKey, email.trim(), password);
    pushToast(r.ok ? 'check' : 'warning', r.message, r.ok ? 'info' : 'warn');
    if (r.ok && !r.needsEmailConfirm) setUserEmail(email.trim());
    setBusy(false);
  };
  const doSignIn = async () => {
    setBusy(true);
    const r = await signIn(cloudSync.url, cloudSync.anonKey, email.trim(), password);
    pushToast(r.ok ? 'check' : 'warning', r.message, r.ok ? 'info' : 'warn');
    if (r.ok) setUserEmail(await currentUserEmail(cloudSync.url, cloudSync.anonKey));
    setBusy(false);
  };
  const doSignOut = async () => {
    await signOut(cloudSync.url, cloudSync.anonKey);
    setUserEmail(null);
  };

  const doPush = async () => {
    if (!passphrase) { pushToast('warning', 'Choisis un mot de passe de chiffrement d’abord', 'warn'); return; }
    setBusy(true);
    try {
      const enc = await encryptText(currentSaveJson(), passphrase);
      const r = await pushSave(cloudSync.url, cloudSync.anonKey, JSON.stringify(enc));
      pushToast(r.ok ? 'check' : 'warning', r.message, r.ok ? 'info' : 'warn');
      if (r.ok) setCloudSync({ lastSyncAt: Date.now() });
    } finally {
      setBusy(false);
    }
  };

  const doPull = async () => {
    if (!passphrase) { pushToast('warning', 'Saisis ton mot de passe de chiffrement d’abord', 'warn'); return; }
    setBusy(true);
    try {
      const r = await pullSave(cloudSync.url, cloudSync.anonKey);
      if (!r.ok || !r.save) { pushToast('warning', r.message, 'warn'); return; }
      setConfirmPull({ payload: r.save.payload, updatedAt: r.save.updatedAt });
    } finally {
      setBusy(false);
    }
  };

  const applyPull = async () => {
    if (!confirmPull) return;
    setBusy(true);
    try {
      const parsed = JSON.parse(confirmPull.payload);
      if (!isEncryptedPayload(parsed)) { pushToast('warning', 'Sauvegarde cloud illisible', 'warn'); return; }
      const plain = await decryptText(parsed, passphrase);
      const ok = importSave(plain);
      pushToast(ok ? 'check' : 'warning', ok ? 'Sauvegarde cloud restaurée' : 'Mot de passe incorrect ou fichier corrompu', ok ? 'info' : 'warn');
      if (ok) setCloudSync({ lastRemoteUpdatedAt: confirmPull.updatedAt });
    } catch {
      pushToast('warning', 'Mot de passe de chiffrement incorrect', 'warn');
    } finally {
      setBusy(false);
      setConfirmPull(null);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>
        Sauvegarde cloud
      </h3>
      <p className="muted" style={{ marginBottom: 10 }}>
        Lie ta progression à un compte personnel pour ne jamais la perdre en changeant d'appareil.
        Nécessite un projet Supabase gratuit (le tien, aucune carte bancaire). Tes données sont
        chiffrées sur cet appareil avant l'envoi — même Supabase ne peut pas les lire.
      </p>

      {!configured ? (
        <>
          <button className="btn small" onClick={() => setShowSetup((v) => !v)}>
            <Icon name="info" size={12} /> {showSetup ? 'Masquer' : 'Comment créer un projet gratuit ?'}
          </button>
          {showSetup && (
            <div className="muted" style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.6 }}>
              1. Crée un compte gratuit sur <strong>supabase.com</strong> → « New project ».<br />
              2. Dans Project Settings → API, copie l'« URL » et la clé « anon public ».<br />
              3. Dans SQL Editor, colle et exécute ce script (une seule fois) :
              <pre style={{ background: 'var(--panel2)', padding: 10, borderRadius: 8, marginTop: 6, overflowX: 'auto', fontSize: 11 }}>{SETUP_SQL}</pre>
              4. Colle l'URL et la clé ci-dessous.
            </div>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <input className="input grow" placeholder="URL du projet (https://xxxx.supabase.co)" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <input className="input grow" type="password" placeholder="Clé publique « anon »" value={anonKey} onChange={(e) => setAnonKey(e.target.value)} />
            <button className="btn primary" onClick={saveConnection} disabled={!url.trim() || !anonKey.trim()}>Connecter</button>
          </div>
        </>
      ) : (
        <>
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="badge"><Icon name="check" size={11} /> Projet connecté</span>
            <button className="btn small danger" onClick={() => setCloudSync({ url: '', anonKey: '' })}>Déconnecter le projet</button>
          </div>

          {!userEmail ? (
            <>
              <div className="row">
                <input className="input grow" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="input grow" type="password" placeholder="Mot de passe du compte" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn" onClick={doSignIn} disabled={busy || !email || !password}>Se connecter</button>
                <button className="btn" onClick={doSignUp} disabled={busy || !email || !password}>Créer un compte</button>
              </div>
            </>
          ) : (
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="badge gold"><Icon name="user" size={11} /> {userEmail}</span>
              <button className="btn small" onClick={doSignOut}>Se déconnecter</button>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0' }} />

          <label className="row" style={{ gap: 10 }}>
            <span className="muted" style={{ width: 160 }}>Mot de passe de chiffrement</span>
            <input
              className="input grow" type="password" placeholder="Choisis-en un et retiens-le bien"
              value={passphrase} onChange={(e) => setPassphrase(e.target.value)}
            />
          </label>
          <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            ⚠ Ce mot de passe n'est jamais stocké ni envoyé. S'il est perdu, la sauvegarde cloud est
            irrécupérable — note-le en lieu sûr.
          </p>

          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={doPush} disabled={busy || !ready}>
              <Icon name="upload" size={13} /> Sauvegarder maintenant
            </button>
            <button className="btn" onClick={doPull} disabled={busy || !ready}>
              <Icon name="download" size={13} /> Restaurer depuis le cloud
            </button>
            <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={cloudSync.autoSync} onChange={(e) => setCloudSync({ autoSync: e.target.checked })} />
              <span className="muted">Sauvegarde auto en quittant l'app</span>
            </label>
          </div>
          {cloudSync.lastSyncAt && (
            <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Dernière sauvegarde envoyée : {new Date(cloudSync.lastSyncAt).toLocaleString('fr-FR')}
            </p>
          )}
        </>
      )}

      {confirmPull && (
        <div className="overlay" onClick={() => setConfirmPull(null)}>
          <div className="form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sauvegarde cloud trouvée</h3>
            <p className="muted">
              Datée du {new Date(confirmPull.updatedAt).toLocaleString('fr-FR')}. La restaurer
              remplacera les données de cet appareil — action irréversible.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setConfirmPull(null)}>Annuler</button>
              <button className="btn primary" onClick={applyPull} disabled={busy}>Restaurer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
