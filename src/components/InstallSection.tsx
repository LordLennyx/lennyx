// ── Installation de Lennyx en application ─────────────────────────────────
// Safari n'offre aucune invite d'installation programmable : sur Mac comme sur
// iPhone, c'est à l'application d'expliquer le geste. On le fait dans les mots
// exacts du menu concerné, sinon la consigne ne sert à rien.

import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import {
  isInstalled, hostKind, appleFlavor, installSteps, pwaCapabilities,
} from '../lib/pwa';

/** Invite d'installation de Chrome/Edge, absente de Safari. */
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallSection() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(isInstalled());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // sinon le navigateur décide seul du moment
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const host = hostKind();
  // Dans l'exe Windows et dans l'APK, la question ne se pose pas.
  if (host === 'electron' || host === 'capacitor') return null;

  const flavor = appleFlavor();
  const guide = installSteps();
  const caps = pwaCapabilities();

  if (installed) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: 8, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>
          <Icon name="check" size={14} style={{ color: 'var(--success)' }} /> Lennyx est installé
        </h3>
        <p className="muted">
          Tu es dans l’application, pas dans un onglet : elle démarre sans réseau et garde ses
          données pour elle. {flavor === 'macos' && 'Cmd + 1 à 9 passent d’une section à l’autre.'}
        </p>
      </div>
    );
  }

  return (
    <div className="card ornate">
      <h3 style={{ marginBottom: 8, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>
        {guide?.title ?? 'Installer Lennyx'}
      </h3>
      <p className="muted" style={{ marginBottom: 10 }}>
        {flavor === 'macos'
          ? 'Installée, Lennyx quitte le navigateur : sa propre fenêtre, son icône dans le Dock, son démarrage instantané, et rien qui dépende du réseau.'
          : 'Installée, Lennyx a son icône, s’ouvre en plein écran et fonctionne hors ligne.'}
      </p>

      {prompt ? (
        <button
          className="btn primary"
          onClick={() => {
            void prompt.prompt();
            void prompt.userChoice.then(() => setPrompt(null));
          }}
        >
          <Icon name="download" size={14} /> Installer maintenant
        </button>
      ) : (
        <ol style={{ margin: '0 0 4px', paddingLeft: 20, lineHeight: 1.8, fontSize: 13.5 }}>
          {guide?.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}

      <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div className="muted" style={{ fontSize: 11, letterSpacing: '0.08em', marginBottom: 6 }}>
          CE QUE TU AURAS
        </div>
        {caps.ok.map((c) => (
          <div key={c} className="muted" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
            <Icon name="check" size={11} style={{ color: 'var(--success)' }} /> {c}
          </div>
        ))}
        <div className="muted" style={{ fontSize: 11, letterSpacing: '0.08em', margin: '10px 0 6px' }}>
          CE QUE SEULES LES VERSIONS WINDOWS ET ANDROID FONT
        </div>
        {caps.ko.map((c) => (
          <div key={c} className="muted" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
            <Icon name="close" size={11} style={{ color: 'var(--muted)' }} /> {c}
          </div>
        ))}
      </div>
    </div>
  );
}
