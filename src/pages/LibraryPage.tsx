import { useState } from 'react';
import { useStore } from '../store/useStore';
import { LIBRARY, TEMPLATE_COUNT } from '../game/library';
import { Icon } from '../components/Icon';
import { DiffTag } from '../components/TaskRow';
import { WEEKDAYS, todayStr } from '../game/engine';

const KIND_LABEL = { daily: 'Quotidienne', timed: 'Chronométrée', quest: 'Quête' } as const;

export default function LibraryPage() {
  const addFromTemplate = useStore((s) => s.addFromTemplate);
  const dailies = useStore((s) => s.dailies);
  const quests = useStore((s) => s.quests);
  const [open, setOpen] = useState<string | null>(LIBRARY[0].id);
  const [search, setSearch] = useState('');
  const t = todayStr();
  void t;

  const has = (title: string) =>
    dailies.some((d) => d.title === title) || quests.some((q) => !q.completedAt && q.title === title);

  const q = search.toLowerCase().trim();

  return (
    <div>
      <h2 className="page-title">Bibliothèque</h2>
      <p className="page-sub">
        {TEMPLATE_COUNT} modèles de tâches répartis en {LIBRARY.length} rubriques — bâtis ta routine en quelques instants.
      </p>

      <input
        className="input"
        style={{ marginBottom: 16 }}
        placeholder="Rechercher un modèle… (ex : douche, code, budget)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {LIBRARY.map((r) => {
        const templates = q
          ? r.templates.filter((tpl) => (tpl.title + ' ' + (tpl.desc ?? '')).toLowerCase().includes(q))
          : r.templates;
        if (q && templates.length === 0) return null;
        const isOpen = q ? true : open === r.id;
        return (
          <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button className="rub-head" onClick={() => setOpen(isOpen && !q ? null : r.id)}>
              <span className="r-icon"><Icon name={r.icon} size={19} /></span>
              <span className="grow">
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.06em', fontSize: 15 }}>
                  {r.name}
                </span>
                <span className="muted" style={{ display: 'block', fontSize: 12 }}>{r.desc}</span>
              </span>
              <span className="muted" style={{ fontSize: 12 }}>{templates.length}</span>
              <Icon name="chevron" size={15} className={`chev ${isOpen ? 'open' : ''}`} />
            </button>
            {isOpen &&
              templates.map((tpl, i) => {
                const exists = has(tpl.title);
                return (
                  <div key={i} className="tpl-row">
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{tpl.title}</div>
                      <div className="muted row" style={{ gap: 10, fontSize: 12, marginTop: 1 }}>
                        <DiffTag d={tpl.difficulty} />
                        <span>{KIND_LABEL[tpl.kind]}</span>
                        {tpl.before && (
                          <span className="row" style={{ gap: 4 }}>
                            <Icon name="clock" size={11} /> avant {tpl.before}
                          </span>
                        )}
                        {tpl.days && tpl.days.length > 0 && tpl.days.length < 7 && (
                          <span>{tpl.days.map((d) => WEEKDAYS.find((w) => w.id === d)?.short).join(' · ')}</span>
                        )}
                        {tpl.desc && <span>{tpl.desc}</span>}
                      </div>
                    </div>
                    <button
                      className={`btn small ${exists ? '' : 'primary'}`}
                      disabled={exists}
                      onClick={() => addFromTemplate(r.id, tpl)}
                    >
                      {exists ? <Icon name="check" size={13} /> : <Icon name="plus" size={13} />}
                      {exists ? 'Ajoutée' : 'Ajouter'}
                    </button>
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
