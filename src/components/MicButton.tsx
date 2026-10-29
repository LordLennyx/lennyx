// ── Le micro posé sur un formulaire ───────────────────────────────────────
// Un bouton, un écran de dictée en mode « un seul brouillon », et le
// formulaire se remplit tout seul. L'utilisateur garde la main : il relit et
// corrige avant que le formulaire ne soit validé.

import { useState } from 'react';
import VoiceCapture from './VoiceCapture';
import { Icon } from './Icon';
import type { VoiceDraft } from '../lib/voiceParse';

export default function MicButton({
  onFill,
  label = 'Dicter',
  heading = 'Dicter ce formulaire',
  intro,
}: {
  /** Reçoit le brouillon relu et validé. */
  onFill: (draft: VoiceDraft) => void;
  label?: string;
  heading?: string;
  intro?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn small mic-btn" onClick={() => setOpen(true)} title="Remplir à la voix">
        <Icon name="mic" size={13} /> {label}
      </button>
      {open && (
        <VoiceCapture
          single
          heading={heading}
          intro={intro ?? 'Dis tout d’un trait : le titre et les paramètres. Tu relis avant de valider.'}
          onClose={() => setOpen(false)}
          onAccept={(drafts) => { if (drafts[0]) onFill(drafts[0]); }}
        />
      )}
    </>
  );
}
