// ── Parcours d'intégration : questionnaire, visite guidée, lancement ──────
import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from './Icon';
import Logo from './Logo';
import type { Profile } from '../game/types';

type Step = 'welcome' | 'goal' | 'rhythm' | 'tone' | 'tour' | 'launch';

const GOALS = [
  { id: 'strict', label: 'Discipline stricte', desc: 'Je veux un cadre exigeant, sans compromis.', icon: 'shield' },
  { id: 'balance', label: 'Équilibre serein', desc: 'Progresser sans me mettre la pression.', icon: 'compass' },
  { id: 'gentle', label: 'Douceur progressive', desc: 'Petits pas, grande constance.', icon: 'seed' },
];

const RHYTHMS = [
  { id: 'early', label: 'Lève-tôt', desc: 'Mes meilleures heures : le matin.', icon: 'sun' },
  { id: 'late', label: 'Couche-tard', desc: "Je carbure le soir, l'aube n'est pas mon fort.", icon: 'moon' },
  { id: 'variable', label: 'Rythme variable', desc: "Ça dépend des jours, je m'adapte.", icon: 'compass' },
];

const TONES: Array<{ id: Profile['llm']['tone']; label: string; desc: string; icon: string }> = [
  { id: 'chaleureux', label: 'Chaleureux', desc: 'Complice, rassurant, jamais culpabilisant.', icon: 'heart' },
  { id: 'direct', label: 'Direct', desc: 'Concis, sans détour, toujours bienveillant.', icon: 'sword' },
  { id: 'motivant', label: 'Motivant', desc: 'Énergique et insistant — mode Duolingo activé.', icon: 'bolt' },
];

const TOUR = [
  { icon: 'sword', title: 'Quêtes & Quotidiennes', text: 'Transforme tes tâches en quêtes. Accomplis-les pour gagner XP et or ; les quotidiennes bâtissent des streaks.' },
  { icon: 'book', title: 'Bibliothèque', text: '~200 modèles de tâches prêtes à l’emploi, classées en 18 rubriques — ajoute-les en un clic.' },
  { icon: 'eye', title: 'Oracle', text: 'Ton confident : il analyse tes statistiques, répond honnêtement et compose tes journées sur demande.' },
  { icon: 'hourglass', title: 'Outils', text: 'Chronomètre, alarmes (réveil & berceuse), podomètre et respiration guidée.' },
  { icon: 'quill', title: 'Notes & Traces de vie', text: 'Finances, journal libre, victoires consignées — pour vider ton esprit et nourrir l’Oracle.' },
  { icon: 'trophy', title: 'Récompenses', text: 'Des dizaines de succès, thèmes, sigils, titres et effets — certains réservés aux légendes.' },
];

export default function Onboarding() {
  const setName = useStore((s) => s.setName);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [step, setStep] = useState<Step>('welcome');
  const [name, setNameLocal] = useState('');
  const [goal, setGoal] = useState<string>('balance');
  const [rhythm, setRhythm] = useState<string>('variable');
  const [tone, setTone] = useState<Profile['llm']['tone']>('chaleureux');
  const [tourIdx, setTourIdx] = useState(0);

  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        color: ['var(--gold)', 'var(--accent)', 'var(--accent2)', '#f4dd8c'][i % 4],
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.2 + Math.random() * 2,
      })),
    [],
  );

  const finish = () => {
    if (name.trim()) setName(name);
    completeOnboarding({ goal, rhythm, tone });
  };

  const STEP_ORDER: Step[] = ['welcome', 'goal', 'rhythm', 'tone', 'tour', 'launch'];
  const progress = STEP_ORDER.indexOf(step);

  return (
    <div className="overlay" style={{ zIndex: 200 }}>
      <div className="form-modal" style={{ maxWidth: 560, textAlign: 'center', gap: 18 }}>
        {step !== 'launch' && (
          <div className="row" style={{ justifyContent: 'center', gap: 6, marginBottom: 4 }}>
            {STEP_ORDER.slice(0, 5).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i <= progress ? 'var(--gold)' : 'var(--border)',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
        )}

        {step === 'welcome' && (
          <>
            <Logo size={72} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.08em', color: 'var(--gold)' }}>
              Bienvenue dans Lennyx
            </h2>
            <p className="muted">
              Une to-do list qui se joue comme une légende. Avant de commencer, quelques questions
              pour que l'Oracle te connaisse dès le premier jour.
            </p>
            <input
              className="input" placeholder="Comment veux-tu qu'on t'appelle ?"
              value={name} autoFocus onChange={(e) => setNameLocal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setStep('goal')}
            />
            <button className="btn primary" style={{ alignSelf: 'center', padding: '11px 28px' }} onClick={() => setStep('goal')}>
              Commencer <Icon name="chevron" size={13} />
            </button>
          </>
        )}

        {step === 'goal' && (
          <>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.06em' }}>Quel est ton objectif ?</h3>
            <div className="grid2">
              {GOALS.map((g) => (
                <div key={g.id} className={`shop-item ${goal === g.id ? 'active' : ''}`} onClick={() => setGoal(g.id)}>
                  <Icon name={g.icon} size={26} style={{ color: 'var(--accent)' }} />
                  <span className="name">{g.label}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{g.desc}</span>
                </div>
              ))}
            </div>
            <button className="btn primary" style={{ alignSelf: 'center', padding: '11px 28px' }} onClick={() => setStep('rhythm')}>
              Suivant <Icon name="chevron" size={13} />
            </button>
          </>
        )}

        {step === 'rhythm' && (
          <>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.06em' }}>Quel est ton rythme de vie ?</h3>
            <div className="grid2">
              {RHYTHMS.map((r) => (
                <div key={r.id} className={`shop-item ${rhythm === r.id ? 'active' : ''}`} onClick={() => setRhythm(r.id)}>
                  <Icon name={r.icon} size={26} style={{ color: 'var(--accent)' }} />
                  <span className="name">{r.label}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{r.desc}</span>
                </div>
              ))}
            </div>
            <button className="btn primary" style={{ alignSelf: 'center', padding: '11px 28px' }} onClick={() => setStep('tone')}>
              Suivant <Icon name="chevron" size={13} />
            </button>
          </>
        )}

        {step === 'tone' && (
          <>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.06em' }}>
              Quel ton pour l'Oracle ?
            </h3>
            <p className="muted">Modifiable à tout moment dans Réglages.</p>
            <div className="grid2">
              {TONES.map((tn) => (
                <div key={tn.id} className={`shop-item ${tone === tn.id ? 'active' : ''}`} onClick={() => setTone(tn.id)}>
                  <Icon name={tn.icon} size={26} style={{ color: 'var(--accent)' }} />
                  <span className="name">{tn.label}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{tn.desc}</span>
                </div>
              ))}
            </div>
            <button className="btn primary" style={{ alignSelf: 'center', padding: '11px 28px' }} onClick={() => setStep('tour')}>
              Visite guidée <Icon name="chevron" size={13} />
            </button>
          </>
        )}

        {step === 'tour' && (
          <>
            <div style={{ minHeight: 180 }}>
              <Icon name={TOUR[tourIdx].icon} size={48} style={{ color: 'var(--gold)' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.06em', marginTop: 12 }}>
                {TOUR[tourIdx].title}
              </h3>
              <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>{TOUR[tourIdx].text}</p>
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
              {TOUR.map((_, i) => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i === tourIdx ? 'var(--gold)' : 'var(--border)' }} />
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              {tourIdx > 0 && (
                <button className="btn" onClick={() => setTourIdx((i) => i - 1)}>Précédent</button>
              )}
              {tourIdx < TOUR.length - 1 ? (
                <button className="btn primary" onClick={() => setTourIdx((i) => i + 1)}>Suivant <Icon name="chevron" size={13} /></button>
              ) : (
                <button className="btn primary" onClick={() => setStep('launch')}>C'est compris <Icon name="check" size={13} /></button>
              )}
            </div>
          </>
        )}

        {step === 'launch' && (
          <div style={{ position: 'relative' }}>
            {pieces.map((p, i) => (
              <span
                key={i} className="confetti-piece"
                style={{ left: `${p.left}%`, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, top: -20 }}
              />
            ))}
            <Logo size={80} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, letterSpacing: '0.1em', color: 'var(--gold)', marginTop: 14 }}>
              C'EST PARTI !
            </h2>
            <p className="muted" style={{ marginTop: 6 }}>
              {name.trim() || 'Aventurier'}, ta légende commence maintenant.
            </p>
            <button className="btn primary" style={{ marginTop: 18, padding: '13px 32px', fontSize: 15 }} onClick={finish}>
              Entrer dans Lennyx
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
