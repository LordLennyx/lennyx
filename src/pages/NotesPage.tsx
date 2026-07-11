import { useState } from 'react';
import { useStore } from '../store/useStore';
import { addDays, todayStr } from '../game/engine';
import { Icon } from '../components/Icon';
import type { NoteKind, TxType } from '../game/types';

type Tab = 'finances' | 'journal' | 'wins';

// ═══════════════ FINANCES ═══════════════

function FinancesTab() {
  const { transactions, addTransaction, deleteTransaction } = useStore();
  const [type, setType] = useState<TxType>('expense');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

  const t = todayStr();
  const month = t.slice(0, 7);
  const txMonth = transactions.filter((x) => x.date.startsWith(month));
  const income = txMonth.filter((x) => x.type === 'income').reduce((a, x) => a + x.amount, 0);
  const expense = txMonth.filter((x) => x.type === 'expense').reduce((a, x) => a + x.amount, 0);
  const reste = income - expense;

  const days: Array<{ d: string; net: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(t, -i);
    const dayTx = transactions.filter((x) => x.date === d);
    const net = dayTx.reduce((a, x) => a + (x.type === 'income' ? x.amount : -x.amount), 0);
    days.push({ d, net });
  }
  const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.net)));

  const submit = () => {
    const n = Number(amount.replace(',', '.'));
    if (!label.trim() || !(n > 0)) return;
    addTransaction({ type, label, amount: n, category: category || undefined });
    setLabel(''); setAmount(''); setCategory('');
  };

  return (
    <>
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="value" style={{ color: 'var(--success)' }}>+{income.toFixed(0)}</div>
          <div className="label">Revenus du mois</div>
        </div>
        <div className="stat-tile">
          <div className="value" style={{ color: 'var(--danger)' }}>-{expense.toFixed(0)}</div>
          <div className="label">Dépenses du mois</div>
        </div>
        <div className="stat-tile">
          <div className="value" style={{ color: reste >= 0 ? 'var(--gold)' : 'var(--danger)' }}>{reste.toFixed(0)}</div>
          <div className="label">Reste à vivre</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <select className="input" style={{ maxWidth: 130 }} value={type} onChange={(e) => setType(e.target.value as TxType)}>
            <option value="expense">Dépense</option>
            <option value="income">Revenu</option>
          </select>
          <input className="input grow" placeholder="Libellé (ex : courses, salaire…)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className="input" style={{ maxWidth: 110 }} type="number" min="0" step="0.01" placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input className="input" style={{ maxWidth: 130 }} placeholder="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} />
          <button className="btn primary" onClick={submit} disabled={!label.trim() || !amount}>
            <Icon name="plus" size={13} /> Ajouter
          </button>
        </div>
      </div>

      <h3 className="section-title"><Icon name="chart" size={13} /> 14 derniers jours (solde net)</h3>
      <div className="card">
        <div className="bars" style={{ alignItems: 'center', position: 'relative' }}>
          {days.map((d) => (
            <div
              key={d.d}
              className="bar"
              style={{
                height: `${Math.max(2, Math.round((Math.abs(d.net) / maxAbs) * 100))}%`,
                background: d.net >= 0 ? 'linear-gradient(180deg, var(--success), var(--accent2))' : 'linear-gradient(180deg, var(--danger), #7a2436)',
              }}
              title={`${d.d} : ${d.net >= 0 ? '+' : ''}${d.net.toFixed(0)}`}
            />
          ))}
        </div>
      </div>

      <h3 className="section-title"><Icon name="coin" size={13} /> Historique</h3>
      {transactions.length === 0 ? (
        <div className="card muted">Aucune transaction. Note tes dépenses et revenus pour connaître ton reste à vivre.</div>
      ) : (
        transactions.slice(0, 20).map((tx) => (
          <div key={tx.id} className="card row" style={{ padding: '10px 16px' }}>
            <span style={{ color: tx.type === 'income' ? 'var(--success)' : 'var(--danger)', fontWeight: 700, minWidth: 80 }}>
              {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(2)}
            </span>
            <div className="grow">
              <strong>{tx.label}</strong>
              <span className="muted"> {tx.category ? `· ${tx.category} ` : ''}· {tx.date}</span>
            </div>
            <button className="btn small danger icon-only" onClick={() => deleteTransaction(tx.id)}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        ))
      )}
    </>
  );
}

// ═══════════════ JOURNAL ═══════════════

function JournalTab() {
  const allNotes = useStore((s) => s.notes);
  const notes = allNotes.filter((n) => n.kind === 'note' || n.kind === 'resolution');
  const addNote = useStore((s) => s.addNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const [kind, setKind] = useState<NoteKind>('note');
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    addNote(kind, text);
    setText('');
  };

  return (
    <>
      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <button className={`chip ${kind === 'note' ? 'on' : ''}`} onClick={() => setKind('note')}>Note libre</button>
          <button className={`chip ${kind === 'resolution' ? 'on' : ''}`} onClick={() => setKind('resolution')}>Résolution</button>
        </div>
        <textarea
          className="input" rows={3}
          placeholder={kind === 'resolution' ? 'Ta résolution du moment…' : 'Vide ton esprit — tout ce qui te passe par la tête…'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn primary" onClick={submit} disabled={!text.trim()}>
            <Icon name="quill" size={13} /> Enregistrer
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="card muted">Rien encore. Note une pensée, une résolution — l'Oracle s'en souviendra.</div>
      ) : (
        notes.map((n) => (
          <div key={n.id} className="card row" style={{ alignItems: 'flex-start' }}>
            <Icon name={n.kind === 'resolution' ? 'target' : 'quill'} size={16} style={{ color: 'var(--accent)', marginTop: 2 }} />
            <div className="grow">
              <div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{n.date}</div>
            </div>
            <button className="btn small danger icon-only" onClick={() => deleteNote(n.id)}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        ))
      )}
    </>
  );
}

// ═══════════════ VICTOIRES ═══════════════

function WinsTab() {
  const allNotes = useStore((s) => s.notes);
  const wins = allNotes.filter((n) => n.kind === 'accomplishment');
  const addNote = useStore((s) => s.addNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    addNote('accomplishment', text);
    setText('');
  };

  return (
    <>
      <div className="card ornate">
        <p className="muted" style={{ marginBottom: 8 }}>
          Consigne une victoire — petite ou grande. Chaque accomplishment noté rapporte un peu d'XP :
          c'est ta mémoire de ce que tu as réussi, pas seulement de ce qu'il te reste à faire.
        </p>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input className="input grow" placeholder="Aujourd'hui, j'ai réussi à…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <button className="btn primary" onClick={submit} disabled={!text.trim()}>
            <Icon name="star" size={13} /> Consigner
          </button>
        </div>
      </div>

      {wins.length === 0 ? (
        <div className="card muted">Aucune victoire consignée. La première est souvent la plus difficile à écrire — vas-y.</div>
      ) : (
        wins.map((n) => (
          <div key={n.id} className="card row">
            <span className="a-icon" style={{ width: 34, height: 34 }}><Icon name="star" size={17} /></span>
            <div className="grow">
              <div>{n.text}</div>
              <div className="muted" style={{ fontSize: 12 }}>{n.date}</div>
            </div>
            <button className="btn small danger icon-only" onClick={() => deleteNote(n.id)}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        ))
      )}
    </>
  );
}

// ═══════════════ PAGE ═══════════════

export default function NotesPage() {
  const [tab, setTab] = useState<Tab>('finances');
  const TABS: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'finances', label: 'Finances', icon: 'coin' },
    { id: 'journal', label: 'Journal', icon: 'quill' },
    { id: 'wins', label: 'Victoires', icon: 'star' },
  ];
  return (
    <div>
      <h2 className="page-title">Notes &amp; Traces de vie</h2>
      <p className="page-sub">Vide ton esprit, suis ton budget, consigne tes victoires — l'Oracle s'en nourrit.</p>
      <div className="row" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`chip ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={13} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'finances' && <FinancesTab />}
      {tab === 'journal' && <JournalTab />}
      {tab === 'wins' && <WinsTab />}
    </div>
  );
}
