import { useState } from 'react';
import { useStore } from '../store/useStore';
import { renderShareCard, type ShareCardData } from '../lib/shareCard';
import { Icon } from './Icon';

export default function ShareCardButton({
  label,
  build,
}: {
  label: string;
  build: () => ShareCardData;
}) {
  const pushToast = useStore((s) => s.pushToast);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const blob = await renderShareCard(build());
      const file = new File([blob], `lennyx-${Date.now()}.png`, { type: 'image/png' });
      const nav = navigator;
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({ files: [file], title: 'Lennyx', text: 'Mes exploits sur Lennyx' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        pushToast('download', 'Carte téléchargée', 'info');
      }
    } catch {
      pushToast('warning', "Impossible de générer la carte pour l'instant", 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="btn primary" onClick={share} disabled={busy}>
      <Icon name="sparkle" size={14} /> {busy ? 'Génération…' : label}
    </button>
  );
}
