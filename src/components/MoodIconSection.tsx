// ── Réglages du visage de Lennyx ──────────────────────────────────────────
// On montre les six humeurs ET celle du moment, avec le détail du calcul :
// une application qui a une opinion doit pouvoir l'expliquer.
//
// ⚠️ L'avertissement sur le raccourci de l'écran d'accueil est délibéré. Sur
// certains lanceurs, changer d'activity-alias fait tomber le raccourci posé à
// la main. Mieux vaut le dire que de le faire découvrir.

import { useState } from 'react';
import { useStore } from '../store/useStore';
import { computeMood, moodDef, MOODS } from '../game/mood';
import { appIconSupported, resetMoodIcon } from '../lib/appIcon';
import { Icon } from './Icon';

export default function MoodIconSection() {
  const profile = useStore((s) => s.profile);
  const quests = useStore((s) => s.quests);
  const dailies = useStore((s) => s.dailies);
  const setMoodIcon = useStore((s) => s.setMoodIcon);
  const [showWhy, setShowWhy] = useState(false);

  const mood = computeMood({ profile, quests, dailies });
  const style = moodDef(mood.id);
  const base = import.meta.env.BASE_URL;

  const toggle = () => {
    const next = !profile.moodIcon;
    setMoodIcon(next);
    // On remet tout de suite l'icône neutre : personne ne doit rester avec un
    // visage « inquiet » gravé après avoir coupé la fonction.
    if (!next) void resetMoodIcon();
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 15 }}>
        Le visage de Lennyx
      </h3>

      <p className="muted" style={{ marginBottom: 12 }}>
        L’icône de l’application, le widget et le blason de l’accueil changent selon la
        satisfaction de Lennyx vis-à-vis de ta journée — tâches faites, retards, streak,
        tendance et pas. Il est indulgent le matin et exigeant le soir.
      </p>

      <div className="mood-crest" style={{ borderColor: `${style.ring}55`, marginBottom: 12 }}>
        <img src={`${base}icons/mood-${mood.id}.svg`} alt="" />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="mood-name" style={{ color: style.ring }}>{style.label}</div>
          <div className="mood-line muted">{mood.line}</div>
          <div className="mood-gauge">
            <div style={{ width: `${mood.score}%`, background: `linear-gradient(90deg, ${style.ring}, ${style.accent})` }} />
          </div>
        </div>
        <span className="badge" style={{ color: style.ring }}>{mood.score}</span>
      </div>

      <div className="row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {MOODS.map((m) => (
          <div key={m.id} style={{ textAlign: 'center', opacity: m.id === mood.id ? 1 : 0.45 }}>
            <img
              src={`${base}icons/mood-${m.id}.svg`}
              alt={m.label}
              width={40}
              height={40}
              style={{ borderRadius: 10, display: 'block' }}
            />
            <div className="muted" style={{ fontSize: 10.5, marginTop: 3 }}>{m.label}</div>
          </div>
        ))}
      </div>

      <p>
        <button className="linklike" onClick={() => setShowWhy((v) => !v)}>
          {showWhy ? 'Masquer' : 'Pourquoi cette humeur ?'}
        </button>
      </p>
      {showWhy && (
        <ul className="muted" style={{ fontSize: 12, margin: '6px 0 12px 16px' }}>
          {mood.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      {appIconSupported() ? (
        <>
          <button className="btn" onClick={toggle}>
            <Icon name={profile.moodIcon ? 'check' : 'close'} size={13} />
            Icône de l’application {profile.moodIcon ? 'dynamique' : 'figée'}
          </button>
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Android ne sait pas redessiner une icône à la volée : Lennyx bascule entre six
            icônes déclarées. Conséquence à connaître — sur certains lanceurs, un raccourci posé
            à la main sur l’écran d’accueil peut disparaître lors d’un changement ; l’application
            reste dans le tiroir. La bascule n’a lieu qu’au vrai changement d’humeur, et au plus
            une fois par demi-heure.
          </p>
        </>
      ) : (
        <p className="muted" style={{ fontSize: 12 }}>
          Sur cette plateforme, le visage s’applique au blason, au favicon et — dans
          l’application Windows — à l’icône de la fenêtre. La bascule de l’icône du lanceur est
          propre à Android.
        </p>
      )}
    </div>
  );
}
