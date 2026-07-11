import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { speak, stopSpeaking } from '../lib/voice';
import { useOnlineStatus } from '../lib/net';

const SUGGESTIONS = ['Bilan', 'Génère ma journée', 'Journée sportive et créative', 'Défie-moi', 'Que me manque-t-il ?', 'Aide'];

export default function OraclePage() {
  const messages = useStore((s) => s.oracleMessages);
  const oracleSend = useStore((s) => s.oracleSend);
  const oracleClear = useStore((s) => s.oracleClear);
  const oracle = useStore((s) => s.profile.oracle);
  const oracleThinking = useStore((s) => s.oracleThinking);
  const cloudOn = useStore((s) => !!s.profile.llm.apiKey.trim());
  const voice = useStore((s) => s.profile.voice);
  const setVoice = useStore((s) => s.setVoice);
  const setOracleOption = useStore((s) => s.setOracleOption);
  const online = useOnlineStatus();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef('');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    // lecture vocale de la dernière réponse de l'Oracle
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
          <span className="badge" title={cloudOn && online ? 'Connecté à Gemini' : cloudOn ? 'Hors-ligne : veille locale' : 'Mode local (aucune clé configurée)'}>
            <Icon name={cloudOn && online ? 'sparkle' : 'eye'} size={12} style={{ color: cloudOn && online ? 'var(--gold)' : 'var(--muted)' }} />
            {cloudOn && online ? 'En ligne' : cloudOn ? 'Veille locale' : 'Local'}
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

      <div className="card ornate">
        <div className="oracle-chat">
          {messages.length === 0 && (
            <div className="msg oracle">
              Je suis l'Oracle de Lennyx. Parle-moi : demande un bilan, un conseil, ou dicte-moi tes
              quêtes — « ajoute une quête ranger le bureau, difficile », « quotidienne se coucher
              avant 23h »… Écris « aide » pour tout voir.
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.role}`}>{m.text}</div>
          ))}
          {oracleThinking && <div className="msg oracle" style={{ opacity: 0.6 }}>…</div>}
          <div ref={endRef} />
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
          ))}
        </div>

        <div className="row" style={{ marginTop: 12, flexWrap: 'nowrap' }}>
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

      <p style={{ marginTop: 14 }}>
        <button className="btn small danger" onClick={oracleClear}>
          <Icon name="trash" size={12} /> Effacer la conversation
        </button>
      </p>
    </div>
  );
}
