import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { speak, stopSpeaking } from '../lib/voice';
import { useOnlineStatus } from '../lib/net';
import { todayStr, addDays } from '../game/engine';

const SUGGESTIONS = ['Bilan', 'Génère ma journée', 'Journée sportive et créative', 'Défie-moi', 'Que me manque-t-il ?', 'Aide'];

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const t = todayStr();
  if (dateStr === t) return "Aujourd'hui";
  if (dateStr === addDays(t, -1)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: dateStr.slice(0, 4) === t.slice(0, 4) ? undefined : 'numeric' });
}

function relTime(ts: number): string {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'à l’instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD} j`;
}

export default function OraclePage() {
  const allConversations = useStore((s) => s.oracleConversations);
  const activeId = useStore((s) => s.activeConversationId);
  const oracleSend = useStore((s) => s.oracleSend);
  const oracleClear = useStore((s) => s.oracleClear);
  const oracleNewConversation = useStore((s) => s.oracleNewConversation);
  const oracleSwitchConversation = useStore((s) => s.oracleSwitchConversation);
  const oracleDeleteConversation = useStore((s) => s.oracleDeleteConversation);
  const oracle = useStore((s) => s.profile.oracle);
  const oracleThinking = useStore((s) => s.oracleThinking);
  const cloudOn = useStore((s) => !!s.profile.llm.apiKey.trim());
  const providerLabel = useStore((s) => (s.profile.llm.provider === 'groq' ? 'Groq' : 'Gemini'));
  const voice = useStore((s) => s.profile.voice);
  const setVoice = useStore((s) => s.setVoice);
  const setOracleOption = useStore((s) => s.setOracleOption);
  const online = useOnlineStatus();
  const [input, setInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef('');

  // conversations triées par activité récente, sans jamais recréer un tableau dans le
  // sélecteur zustand (ce pattern a déjà causé un crash — cf. correctif Notes/Journal)
  const conversations = [...allConversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const active = allConversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    const last = messages[messages.length - 1];
    if (voice.spoken && last && last.role === 'oracle' && last.id !== lastSpokenRef.current) {
      lastSpokenRef.current = last.id;
      void speak(last.text, voice);
    }
  }, [messages, voice]);

  useEffect(() => () => void stopSpeaking(), []);

  const send = (text: string) => {
    void oracleSend(text);
    setInput('');
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 className="page-title">L'Oracle</h2>
        <div className="row">
          <span
            className="badge"
            title={
              cloudOn && online
                ? `Connecté à ${providerLabel}`
                : cloudOn
                  ? 'Hors-ligne : veille locale'
                  : 'Mode local (aucune clé configurée)'
            }
          >
            <Icon name={cloudOn && online ? 'sparkle' : 'eye'} size={12} style={{ color: cloudOn && online ? 'var(--gold)' : 'var(--muted)' }} />
            {cloudOn && online ? providerLabel : cloudOn ? 'Veille locale' : 'Local'}
          </span>
          <button
            className={`chip ${voice.spoken ? 'on' : ''}`}
            onClick={() => {
              if (voice.spoken) void stopSpeaking();
              setVoice({ spoken: !voice.spoken });
            }}
            title="L'Oracle lit ses réponses à voix haute (voix réglable dans Réglages)"
          >
            <Icon name="sparkle" size={13} /> Voix {voice.spoken ? 'activée' : 'coupée'}
          </button>
        </div>
      </div>
      <p className="page-sub">
        {cloudOn
          ? 'Ton confident connecté — il te connaît par cœur et ne partage rien avec personne d’autre.'
          : 'Analyste, devin et encyclopédie — configure une clé gratuite dans Réglages pour le rendre conversationnel.'}
      </p>

      <div className="row" style={{ marginBottom: 12, alignItems: 'center' }}>
        <div className="row keep-row" style={{ flex: 1, overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 4 }}>
          {conversations.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Aucune conversation pour l'instant</span>}
          {conversations.map((c) => (
            <button
              key={c.id}
              className={`chip ${c.id === activeId ? 'on' : ''}`}
              style={{ flexShrink: 0 }}
              onClick={() => oracleSwitchConversation(c.id)}
              title={relTime(c.updatedAt)}
            >
              {c.title}
            </button>
          ))}
        </div>
        <button className="btn small" onClick={oracleNewConversation} title="Nouvelle conversation">
          <Icon name="plus" size={12} /> Nouvelle
        </button>
      </div>

      <div className="card ornate">
        <div className="oracle-chat">
          {messages.length === 0 && (
            <div className="msg oracle">
              Je suis l'Oracle de Lennyx. Parle-moi : demande un bilan, un conseil, ou dicte-moi tes
              quêtes — « ajoute une quête ranger le bureau, difficile », « quotidienne se coucher
              avant 23h »… Écris « aide » pour tout voir.
            </div>
          )}
          {messages.map((m, i) => {
            const showDate = i === 0 || dayLabel(m.ts) !== dayLabel(messages[i - 1].ts);
            return (
              <div key={m.id}>
                {showDate && (
                  <div className="muted" style={{ textAlign: 'center', fontSize: 11, margin: '6px 0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {dayLabel(m.ts)}
                  </div>
                )}
                <div className={`msg ${m.role}`}>{m.text}</div>
                {m.created && m.created.length > 0 && (
                  <div className="oracle-created">
                    <div className="oracle-created-head">
                      <Icon name="check" size={12} /> Ajouté à ton journal
                    </div>
                    {m.created.map((c, k) => (
                      <div key={k} className="oracle-created-item">{c}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {oracleThinking && <div className="msg oracle" style={{ opacity: 0.6 }}>…</div>}
          <div ref={endRef} />
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
          ))}
        </div>

        <div className="row keep-row" style={{ marginTop: 12, flexWrap: 'nowrap' }}>
          <input
            className="input grow"
            placeholder="Parle à l'Oracle…"
            value={input}
            disabled={oracleThinking}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && input.trim() && send(input)}
          />
          <button className="btn primary icon-only" style={{ padding: 11 }} disabled={!input.trim() || oracleThinking} onClick={() => send(input)}>
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>

      <h3 className="section-title"><Icon name="gear" size={13} /> Automatisations</h3>
      <div className="card">
        <label className="row" style={{ gap: 10, cursor: 'pointer', padding: '4px 0' }}>
          <input type="checkbox" checked={oracle.briefing} onChange={(e) => setOracleOption('briefing', e.target.checked)} />
          <div>
            <div style={{ fontWeight: 700 }}>Briefing quotidien</div>
            <div className="muted">Chaque jour à la première ouverture, l'Oracle dresse ton programme et tes suggestions.</div>
          </div>
        </label>
        <label className="row" style={{ gap: 10, cursor: 'pointer', padding: '10px 0 4px' }}>
          <input type="checkbox" checked={oracle.sentinel} onChange={(e) => setOracleOption('sentinel', e.target.checked)} />
          <div>
            <div style={{ fontWeight: 700 }}>Sentinelle du soir</div>
            <div className="muted">Après 18h, l'Oracle t'alerte si des quotidiennes menacent tes streaks.</div>
          </div>
        </label>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn small" onClick={oracleClear} disabled={!active}>
          <Icon name="close" size={12} /> Vider cette conversation
        </button>
        {confirmDelete ? (
          <>
            <span className="muted">Supprimer « {active?.title} » ?</span>
            <button
              className="btn small danger"
              onClick={() => { if (active) oracleDeleteConversation(active.id); setConfirmDelete(false); }}
            >
              Confirmer
            </button>
            <button className="btn small" onClick={() => setConfirmDelete(false)}>Annuler</button>
          </>
        ) : (
          <button className="btn small danger" onClick={() => setConfirmDelete(true)} disabled={!active}>
            <Icon name="trash" size={12} /> Supprimer cette conversation
          </button>
        )}
      </div>
    </div>
  );
}
