// ContextSearchBody.js — Context Search body with a dropdown of existing DBs,
// so you can search a saved context WITHOUT wiring a Context Builder.
// (A wired `context` input still takes precedence at run time.)
import { useEffect, useState } from 'react';
import { getContexts } from '../api';

export function ContextSearchBody({ values, setField }) {
  const [contexts, setContexts] = useState([]);
  const [offline, setOffline] = useState(false);

  const load = () => {
    getContexts()
      .then((rows) => { setContexts(rows || []); setOffline(false); })
      .catch(() => setOffline(true));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="vs-textnode">
      <label className="vs-field">
        <span className="vs-field__label">Existing DB (optional)</span>
        <select
          className="vs-input nodrag"
          value={values.contextId || ''}
          onChange={(e) => setField('contextId', e.target.value)}
        >
          <option value="">— use wired context —</option>
          {contexts.map((c) => (
            <option key={c.collection} value={c.collection}>
              {(c.doc_name || c.collection)}{c.count ? ` (${c.count})` : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="vs-field">
        <span className="vs-field__label">Results (top-K)</span>
        <input
          className="vs-input nodrag"
          type="number"
          min="1"
          max="20"
          value={values.topK ?? '7'}
          onChange={(e) => setField('topK', e.target.value)}
        />
      </label>

      <button type="button" className="vs-mini-btn nodrag" onClick={load}>
        ↻ refresh list
      </button>
      {offline ? <span className="vs-field__label">backend offline — can't list DBs</span> : null}
    </div>
  );
}
