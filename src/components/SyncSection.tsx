// ── Synchronisation PC ↔ téléphone en réseau local (zéro serveur) ─────────
// Sur PC (Electron) : héberge une session, affiche QR + adresse + code.
// Sur téléphone/web : se connecte à l'adresse du PC pour tirer/pousser la
// sauvegarde. Fonctionne uniquement sur le même Wi-Fi/réseau.

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useStore } from '../store/useStore';
import { levelFromXp } from '../game/xp';
import { Icon } from './Icon';

interface SyncApi {
  start: (payload: string) => Promise<{ ips: string[]; port: number; token: string }>;
  stop: () => Promise<boolean>;
  update: (payload: string) => Promise<boolean>;
  onIncoming: (cb: (body: string) => void) => () => void;
}

declare global {
  interface Window {
    lennyxSync?: SyncApi;
  }
}

function currentSaveJson(): string {
  const s = useStore.getState();
  return JSON.stringify({
    profile: s.profile,
    quests: s.quests,
    dailies: s.dailies,
    oracleMessages: s.oracleMessages,
    lastReconcile: s.lastReconcile,
  });
}

function saveSummary(json: string): string {
  try {
    const d = JSON.parse(json);
    const lvl = levelFromXp(d.profile?.xp ?? 0).level;
    return `niveau ${lvl}, ${d.profile?.xp ?? 0} XP, ${d.quests?.length ?? 0} quête(s), ${d.dailies?.length ?? 0} quotidienne(s)`;
  } catch {
    return 'contenu illisible';
  }
}

// ── Mode hôte (PC / Electron) ─────────────────────────────────────────────
function HostMode({ api }: { api: SyncApi }) {
  const importSave = useStore((s) => s.importSave);
  const pushToast = useStore((s) => s.pushToast);
  const [session, setSession] = useState<{ ips: string[]; port: number; token: string } | null>(null);
  const [qr, setQr] = useState('');
  const [incoming, setIncoming] = useState<string | null>(null);

  useEffect(() => {
    const off = api.onIncoming((body) => setIncoming(body));
    return () => {
      off();
      void api.stop();
    };
  }, [api]);

  const start = async () => {
    try {
      const info = await api.start(currentSaveJson());
      setSession(info);
      const ip = info.ips[0] ?? 'localhost';
      const url = `http://${ip}:${info.port}/`;
      setQr(await QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#0a0a0d', light: '#eae6dc' } }));
    } catch {
      pushToast('warning', 'Impossible de démarrer la session (port occupé ?)', 'warn');
    }
  };

  const stop = async () => {
    await api.stop();
    setSession(null);
    setQr('');
  };

  return (
    <>
      {!session ? (
        <>
          <p className="muted" style={{ marginBottom: 10 }}>
            Démarre une session : ton PC devient l'hôte, ton téléphone (sur le même Wi-Fi) pourra
            récupérer ou envoyer sa sauvegarde.
          </p>
          <button className="btn primary" onClick={start}>
            <Icon name="bolt" size={14} /> Démarrer la session de sync
          </button>
        </>
      ) : (
        <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
          {qr && (
            <img
              src={qr}
              alt="QR de session"
              style={{ borderRadius: 12, border: '1px solid var(--border)', width: 150, height: 150 }}
            />
          )}
          <div className="grow">
            <p className="muted">Sur ton téléphone, ouvre Lennyx → Réglages → Synchronisation, et saisis :</p>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)', letterSpacing: '0.08em', margin: '8px 0' }}>
              {session.ips[0]}:{session.port}
            </div>
            <p className="muted">Code de session :</p>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--gold)', letterSpacing: '0.3em' }}>
              {session.token}
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              (Le QR ouvre une page d'aide avec ces informations sur le téléphone.)
            </p>
            <button className="btn small danger" style={{ marginTop: 10 }} onClick={stop}>
              Arrêter la session
            </button>
          </div>
        </div>
      )}

      {incoming && (
        <div className="overlay" onClick={() => setIncoming(null)}>
          <div className="form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sauvegarde reçue du téléphone</h3>
            <p className="muted">
              Le téléphone propose sa sauvegarde ({saveSummary(incoming)}). Remplacer les données de
              ce PC ? Cette action est irréversible.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setIncoming(null)}>Refuser</button>
              <button
                className="btn primary"
                onClick={() => {
                  const ok = importSave(incoming);
                  pushToast(ok ? 'check' : 'warning', ok ? 'Sauvegarde du téléphone importée' : 'Sauvegarde invalide', ok ? 'info' : 'warn');
                  setIncoming(null);
                  if (ok) void api.update(currentSaveJson());
                }}
              >
                Remplacer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Mode client (téléphone / web) ─────────────────────────────────────────
function ClientMode() {
  const importSave = useStore((s) => s.importSave);
  const pushToast = useStore((s) => s.pushToast);
  const syncHost = useStore((s) => s.profile.syncHost);
  const setSyncHost = useStore((s) => s.setSyncHost);
  const [host, setHost] = useState(syncHost ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmPull, setConfirmPull] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const base = () => `http://${host.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')}/save?token=${code.trim()}`;

  const pull = async () => {
    setBusy(true);
    try {
      abortRef.current = new AbortController();
      const timeout = setTimeout(() => abortRef.current?.abort(), 8000);
      const res = await fetch(base(), { signal: abortRef.current.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(res.status === 403 ? 'code invalide' : 'erreur serveur');
      setConfirmPull(await res.text());
      setSyncHost(host.trim());
    } catch (e) {
      pushToast('warning', `Connexion impossible : ${e instanceof Error ? e.message : 'vérifie l’adresse, le code et le Wi-Fi'}`, 'warn');
    } finally {
      setBusy(false);
    }
  };

  const push = async () => {
    setBusy(true);
    try {
      abortRef.current = new AbortController();
      const timeout = setTimeout(() => abortRef.current?.abort(), 8000);
      const res = await fetch(base(), { method: 'POST', body: currentSaveJson(), signal: abortRef.current.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(res.status === 403 ? 'code invalide' : 'erreur serveur');
      setSyncHost(host.trim());
      pushToast('check', 'Sauvegarde envoyée — confirme sur le PC', 'info');
    } catch (e) {
      pushToast('warning', `Envoi impossible : ${e instanceof Error ? e.message : 'vérifie la connexion'}`, 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="muted" style={{ marginBottom: 10 }}>
        Sur ton PC, ouvre Lennyx → Réglages → Synchronisation → « Démarrer la session », puis
        recopie l'adresse et le code affichés (même Wi-Fi obligatoire).
      </p>
      <div className="row">
        <input
          className="input grow"
          placeholder="Adresse du PC (ex : 192.168.1.20:41214)"
          value={host}
          onChange={(e) => setHost(e.target.value)}
        />
        <input
          className="input"
          style={{ width: 120 }}
          placeholder="Code"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" disabled={busy || !host.trim() || code.trim().length < 6} onClick={pull}>
          <Icon name="download" size={14} /> Récupérer la sauvegarde du PC
        </button>
        <button className="btn" disabled={busy || !host.trim() || code.trim().length < 6} onClick={push}>
          <Icon name="upload" size={14} /> Envoyer ma sauvegarde au PC
        </button>
      </div>

      {confirmPull && (
        <div className="overlay" onClick={() => setConfirmPull(null)}>
          <div className="form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sauvegarde du PC reçue</h3>
            <p className="muted">
              Elle contient : {saveSummary(confirmPull)}. Remplacer les données de cet appareil ?
              Cette action est irréversible.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setConfirmPull(null)}>Annuler</button>
              <button
                className="btn primary"
                onClick={() => {
                  const ok = importSave(confirmPull);
                  pushToast(ok ? 'check' : 'warning', ok ? 'Sauvegarde du PC importée' : 'Sauvegarde invalide', ok ? 'info' : 'warn');
                  setConfirmPull(null);
                }}
              >
                Remplacer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SyncSection() {
  const api = window.lennyxSync;
  return (
    <div className="card">
      <h3 style={{ marginBottom: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>
        Synchronisation PC ↔ téléphone
      </h3>
      {api ? <HostMode api={api} /> : <ClientMode />}
    </div>
  );
}
