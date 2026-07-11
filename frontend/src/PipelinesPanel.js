// PipelinesPanel.js — save the current canvas with a name, and load saved pipelines.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, FolderOpen } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from './store';
import { savePipeline, listPipelines, getPipeline } from './api';

const selector = (s) => ({ nodes: s.nodes, edges: s.edges, setGraph: s.setGraph });

export function PipelinesPanel({ onClose }) {
  const { nodes, edges, setGraph } = useStore(useShallow(selector));
  const [name, setName] = useState('');
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  const [offline, setOffline] = useState(false);

  const refresh = () => {
    listPipelines()
      .then((rows) => { setItems(rows || []); setOffline(false); })
      .catch(() => setOffline(true));
  };
  useEffect(() => { refresh(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { setMsg('Enter a name first'); return; }
    try {
      await savePipeline(name.trim(), { nodes, edges });
      setMsg(`Saved "${name.trim()}"`);
      setName('');
      refresh();
    } catch {
      setMsg('Save failed — is the backend running?');
    }
  };

  const handleLoad = async (id, label) => {
    try {
      const p = await getPipeline(id);
      setGraph(p.graph?.nodes || [], p.graph?.edges || []);
      onClose();
    } catch {
      setMsg(`Couldn't load "${label}"`);
    }
  };

  return createPortal(
    <div className="vs-io__overlay" onClick={onClose}>
      <div className="vs-pipes" onClick={(e) => e.stopPropagation()}>
        <div className="vs-io__head">
          <span>Pipelines</span>
          <button className="vs-io__close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="vs-pipes__save">
          <input
            className="vs-input"
            placeholder="Name this pipeline…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button className="vs-submit__btn" onClick={handleSave}>
            <Save size={14} /> Save current
          </button>
        </div>
        {msg ? <div className="vs-pipes__msg">{msg}</div> : null}

        <div className="vs-io__label">Saved pipelines</div>
        {offline ? (
          <p className="vs-io__empty">Backend offline — can't list pipelines.</p>
        ) : items.length === 0 ? (
          <p className="vs-io__empty">None saved yet.</p>
        ) : (
          <ul className="vs-pipes__list">
            {items.map((p) => (
              <li key={p.id}>
                <button className="vs-pipes__item" onClick={() => handleLoad(p.id, p.name)}>
                  <FolderOpen size={15} />
                  <span>{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
