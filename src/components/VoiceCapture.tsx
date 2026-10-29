// ── L'écran de dictée ─────────────────────────────────────────────────────
// Le principe de confiance : Lennyx MONTRE toujours ce qu'il a compris avant
// de créer quoi que ce soit. La dictée brute reste affichée et modifiable, les
// brouillons sont éditables champ par champ, et rien n'existe tant que le
// bouton « Tout créer » n'a pas été touché.
//
// ⚠️ La zone de texte est TOUJOURS là, même quand le micro fonctionne : c'est
// elle qui permet de corriger un mot mal entendu, et c'est aussi le chemin de
// la dictée système de Windows (Win + H), qui écrit directement dedans.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { DIFFICULTIES, DIFFICULTY_ORDER, WEEKDAYS, type Difficulty } from '../game/engine';
import { LIBRARY } from '../game/library';
import { kindLabel, parseVoice, type DraftKind, type VoiceDraft } from '../lib/voiceParse';
import { dictationStatus, openVoiceSettings, startDictation, type DictationSession, type DictationStatus } from '../lib/dictation';
import { Icon } from './Icon';

const KINDS: DraftKind[] = ['quest', 'daily', 'note', 'resolution', 'win', 'expense', 'income'];

/**
 * Un brouillon est-il créable en l'état ?
 * ⚠️ Une transaction sans montant serait ignorée en silence par le store —
 * exactement le genre de disparition inexplicable qu'il ne faut pas livrer.
 * On l'exclut du compte et du bouton, et la carte dit pourquoi.
 */
function usableDraft(d: VoiceDraft): boolean {
  if (!d.title.trim()) return false;
  if (d.kind === 'expense' || d.kind === 'income') return !!d.amount && d.amount > 0;
  return true;
}

const EXAMPLES = [
  'Crée une quotidienne chronométrée arriver à l’école avant sept heures trente, en semaine, difficile.',
  'Ajoute une quête épique réviser les mathématiques pour vendredi.',
  'Note que j’ai mal dormi cette nuit.',
  'J’ai dépensé deux mille francs pour le transport.',
];

export default function VoiceCapture({
  onClose,
  onAccept,
  heading = 'Dictée',
  intro = 'Annonce ta journée. Tâches, quêtes, notes, dépenses — tout d’un trait.',
  single = false,
}: {
  onClose: () => void;
  /** Par défaut, les brouillons sont créés dans le jeu. */
  onAccept?: (drafts: VoiceDraft[]) => void;
  heading?: string;
  intro?: string;
  /** Mode formulaire : un seul brouillon, renvoyé à l'appelant. */
  single?: boolean;
}) {
  const dictation = useStore((s) => s.profile.dictation);
  const applyVoiceDrafts = useStore((s) => s.applyVoiceDrafts);
  const setDictation = useStore((s) => s.setDictation);

  const [status, setStatus] = useState<DictationStatus | null>(null);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [drafts, setDrafts] = useState<VoiceDraft[]>([]);
  const [error, setError] = useState('');
  const sessionRef = useRef<DictationSession | null>(null);

  useEffect(() => {
    let alive = true;
    void dictationStatus().then((s) => { if (alive) setStatus(s); });
    return () => { alive = false; };
  }, []);

  // On arrête proprement le micro si l'écran se ferme en cours de dictée.
  useEffect(() => () => { void sessionRef.current?.cancel(); }, []);

  // L'analyse suit la frappe — mais pas à chaque caractère.
  useEffect(() => {
    const id = setTimeout(() => {
      const text = transcript.trim();
      if (!text) { setDrafts([]); return; }
      const parsed = parseVoice(text).drafts;
      setDrafts(single ? parsed.slice(0, 1) : parsed);
    }, 220);
    return () => clearTimeout(id);
  }, [transcript, single]);

  const start = useCallback(async () => {
    setError('');
    try {
      const session = await startDictation(
        {
          onPartial: (text) => setTranscript(text),
          onFinal: (text) => { if (text) setTranscript(text); setListening(false); setLevel(0); },
          onError: (message) => { setError(message); setListening(false); setLevel(0); },
          onLevel: (l) => setLevel(l),
        },
        { offlineOnly: dictation.offlineOnly },
      );
      sessionRef.current = session;
      setListening(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [dictation.offlineOnly]);

  const stop = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setListening(false);
    setLevel(0);
    if (!session) return;
    const text = await session.stop();
    if (text) setTranscript(text);
  }, []);

  const patch = (id: string, change: Partial<VoiceDraft>) =>
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...change } : d)));

  const accept = () => {
    const usable = drafts.filter(usableDraft);
    if (usable.length === 0) return;
    if (onAccept) onAccept(usable);
    else applyVoiceDrafts(usable);
    onClose();
  };

  const canSpeak = status?.available ?? false;
  const usable = drafts.filter(usableDraft);

  return (
    // ⚠️ stopPropagation sur le fond : cet écran s'ouvre PAR-DESSUS un
    // formulaire qui a lui aussi un fond cliquable. Sans ça, fermer la dictée
    // fermait aussi le formulaire qui l'avait appelée.
    <div className="overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="form-modal voice-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="row" style={{ gap: 8 }}>
          <Icon name="mic" size={17} style={{ color: 'var(--gold)' }} /> {heading}
        </h3>
        <p className="muted" style={{ marginTop: -4 }}>{intro}</p>

        {/* ── le micro ── */}
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          {canSpeak ? (
            <button
              className={`btn ${listening ? 'danger' : 'primary'}`}
              onClick={() => (listening ? void stop() : void start())}
              style={{ minWidth: 148 }}
            >
              <Icon name={listening ? 'wave' : 'mic'} size={15} />
              {listening ? 'Terminer la dictée' : 'Parler'}
            </button>
          ) : (
            <span className="badge" style={{ color: 'var(--muted)' }}>
              <Icon name="micOff" size={13} /> Micro indisponible ici
            </span>
          )}
          {listening && (
            <div className="voice-level" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} style={{ transform: `scaleY(${0.3 + Math.min(1, level * (1 + i * 0.25)) * 1.6})` }} />
              ))}
            </div>
          )}
          {transcript && !listening && (
            <button className="btn small" onClick={() => { setTranscript(''); setDrafts([]); setError(''); }}>
              <Icon name="close" size={12} /> Effacer
            </button>
          )}
        </div>

        {status && (
          <p className="muted" style={{ fontSize: 12 }}>
            {status.offline && status.available && <strong style={{ color: 'var(--success)' }}>Hors ligne · </strong>}
            {status.detail}
            {status.engine === 'android' && (
              <>
                {' '}
                <button className="linklike" onClick={() => void openVoiceSettings()}>
                  Ouvrir les réglages de saisie vocale
                </button>
              </>
            )}
          </p>
        )}
        {error && <p className="muted" style={{ color: 'var(--danger)' }}>{error}</p>}

        {/* ── la transcription, toujours modifiable ── */}
        <label>
          <span className="muted">Ce que Lennyx a entendu — corrige librement</span>
          <textarea
            className="input"
            rows={3}
            value={transcript}
            placeholder={EXAMPLES[0]}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </label>

        {!transcript && (
          <div className="card" style={{ padding: '10px 14px' }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Exemples de ce que tu peux dire :</div>
            {EXAMPLES.map((ex) => (
              <button key={ex} className="linklike" style={{ display: 'block', textAlign: 'left', marginBottom: 3 }}
                onClick={() => setTranscript(ex)}>
                « {ex} »
              </button>
            ))}
          </div>
        )}

        {/* ── les brouillons ── */}
        {usable.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="muted">
              {usable.length === 1 ? 'Voici ce que je crée :' : `Voici les ${usable.length} éléments que je crée :`}
            </span>
            {drafts.map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                single={single}
                onChange={(change) => patch(d.id, change)}
                onRemove={() => setDrafts((list) => list.filter((x) => x.id !== d.id))}
              />
            ))}
          </div>
        )}

        <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={dictation.offlineOnly}
            onChange={(e) => setDictation({ offlineOnly: e.target.checked })}
          />
          <span className="muted" style={{ fontSize: 12 }}>
            Exiger la reconnaissance hors ligne (aucune donnée ne sort de l’appareil)
          </span>
        </label>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={accept} disabled={usable.length === 0}>
            <Icon name="check" size={13} />
            {single ? 'Remplir le formulaire' : `Tout créer${usable.length > 1 ? ` (${usable.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════ une carte de brouillon ═══════════════

function DraftCard({
  draft, single, onChange, onRemove,
}: {
  draft: VoiceDraft;
  single: boolean;
  onChange: (change: Partial<VoiceDraft>) => void;
  onRemove: () => void;
}) {
  const d = draft;
  const isTask = d.kind === 'quest' || d.kind === 'daily';
  const isMoney = d.kind === 'expense' || d.kind === 'income';

  const toggleDay = (n: number) =>
    onChange({ days: d.days.includes(n) ? d.days.filter((x) => x !== n) : [...d.days, n] });

  return (
    <div className="card" style={{ padding: '12px 14px', gap: 8, display: 'flex', flexDirection: 'column' }}>
      <div className="row keep-row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <div className="grow" style={{ minWidth: 0 }}>
          {/* le type se corrige d'un geste : c'est la soupape du parseur */}
          <div className="row" style={{ gap: 5, marginBottom: 7 }}>
            {KINDS.map((k) => (
              <button
                key={k}
                className={`chip ${d.kind === k ? 'on' : ''}`}
                style={{ fontSize: 10.5, padding: '3px 8px' }}
                onClick={() => onChange({ kind: k })}
              >
                {kindLabel(k)}
              </button>
            ))}
          </div>
          <input
            className="input"
            value={d.title}
            placeholder="Titre"
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        {!single && (
          <button className="btn small danger icon-only" onClick={onRemove} title="Retirer de la dictée">
            <Icon name="trash" size={13} />
          </button>
        )}
      </div>

      {isTask && (
        <>
          <div className="row">
            <label className="grow">
              <span className="muted">Difficulté</span>
              <select className="input" value={d.difficulty} onChange={(e) => onChange({ difficulty: e.target.value as Difficulty })}>
                {DIFFICULTY_ORDER.map((x) => (
                  <option key={x} value={x}>{DIFFICULTIES[x].label}</option>
                ))}
              </select>
            </label>
            <label className="grow">
              <span className="muted">Rubrique</span>
              <select className="input" value={d.category ?? ''} onChange={(e) => onChange({ category: e.target.value || undefined })}>
                <option value="">—</option>
                {LIBRARY.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          </div>
          {d.kind === 'quest' ? (
            <div className="row">
              <label className="grow">
                <span className="muted">Échéance</span>
                <input className="input" type="date" value={d.deadline ?? ''} onChange={(e) => onChange({ deadline: e.target.value || undefined })} />
              </label>
              <label className="row grow" style={{ gap: 8, cursor: 'pointer', alignItems: 'center' }}>
                <input type="checkbox" checked={d.isEvent} onChange={(e) => onChange({ isEvent: e.target.checked })} />
                <span className="muted">Événement spécial (×2)</span>
              </label>
            </div>
          ) : (
            <>
              <div>
                <span className="muted">Jours (aucun = tous les jours)</span>
                <div className="row" style={{ marginTop: 5 }}>
                  {WEEKDAYS.map((x) => (
                    <button key={x.id} className={`chip ${d.days.includes(x.id) ? 'on' : ''}`}
                      style={{ fontSize: 11, padding: '3px 9px' }} onClick={() => toggleDay(x.id)}>
                      {x.short}
                    </button>
                  ))}
                </div>
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!d.timeLimit}
                    onChange={(e) => onChange({ timeLimit: e.target.checked ? (d.timeLimit ?? '08:00') : undefined })}
                  />
                  <span className="muted">Chronométrée — avant</span>
                </label>
                {d.timeLimit && (
                  <input className="input" type="time" style={{ width: 112 }} value={d.timeLimit}
                    onChange={(e) => onChange({ timeLimit: e.target.value })} />
                )}
              </div>
            </>
          )}
          {d.subquests.length > 0 && (
            <div className="muted" style={{ fontSize: 12 }}>
              Étapes : {d.subquests.join(' · ')}
            </div>
          )}
        </>
      )}

      {isMoney && (
        <div className="row">
          <label className="grow">
            <span className="muted">Montant</span>
            <input
              className="input" type="number" inputMode="decimal" min="0" step="0.01"
              value={d.amount ?? ''}
              onChange={(e) => onChange({ amount: Number(e.target.value) || undefined })}
            />
          </label>
          <label className="grow">
            <span className="muted">Catégorie</span>
            <input className="input" value={d.txCategory ?? ''} placeholder="optionnel"
              onChange={(e) => onChange({ txCategory: e.target.value || undefined })} />
          </label>
        </div>
      )}

      {isMoney && !(d.amount && d.amount > 0) && (
        <div style={{ fontSize: 12, color: 'var(--danger)' }}>
          Montant manquant — complète-le, sinon cette ligne ne sera pas créée.
        </div>
      )}

      {d.description && (
        <div className="muted" style={{ fontSize: 12 }}>{d.description}</div>
      )}

      {d.flags.length > 0 && (
        <div className="row" style={{ gap: 5 }}>
          {d.flags.map((f, i) => (
            <span key={i} className="chip readonly" style={{ fontSize: 10, padding: '2px 7px' }}>{f}</span>
          ))}
        </div>
      )}

      <div className="muted" style={{ fontSize: 11, opacity: 0.7 }}>
        Dicté : « {d.raw} »
      </div>
    </div>
  );
}
