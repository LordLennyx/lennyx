import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';

const SUGGESTIONS = ['Bilan', 'Génère ma journée', 'Conseil', 'Que me reste-t-il ?', 'Aide'];

export default function OraclePage() {
  const messages = useStore((s) => s.oracleMessages);
  const oracleSend = useStore((s) => s.oracleSend);
  const oracleClear = useStore((s) => s.oracleClear);
  const oracle = useStore((s) => s.profile.oracle);
  const setOracleOption = useStore((s) => s.setOracleOption);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = (text: string) => {
    oracleSend(text);
    setInput('');
  };

  return (
    <div>
      <h2 className="page-title">L'Oracle</h2>
      <p className="page-sub">
        Ton conseiller intégré — il vit dans l'application, hors ligne, et ne partage rien avec personne.
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && input.trim() && send(input)}
          />
          <button className="btn primary icon-only" style={{ padding: 11 }} disabled={!input.trim()} onClick={() => send(input)}>
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
