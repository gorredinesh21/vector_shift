// submit.js
// Sends the current pipeline (nodes + edges) to the backend and shows the
// analysis (num_nodes, num_edges, is_dag) inline next to the button.
//
// It also console.logs the exact payload sent and the response received, so you
// can verify in DevTools that the canvas is captured as a graph and the numbers
// are calculated by the backend.

import { useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';

const API_URL = 'http://localhost:8000/pipelines/parse';

const selector = (state) => ({ nodes: state.nodes, edges: state.edges });

export const SubmitButton = () => {
  const { nodes, edges } = useStore(useShallow(selector));
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const payload = { nodes, edges };
    // Proof the canvas is stored as a graph — inspect this in the browser console.
    console.log('[VectorShift] submitting pipeline graph:', payload);
    console.log(`[VectorShift] ${nodes.length} nodes, ${edges.length} edges on canvas`);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      console.log('[VectorShift] backend response:', data);
      setResult(data);
    } catch (e) {
      console.error('[VectorShift] submit failed:', e);
      setError(e.message || 'Could not reach the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vs-submit">
      <button type="button" className="vs-submit__btn" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Submitting…' : 'Submit Pipeline'}
      </button>

      {result && (
        <div className="vs-result" role="status">
          <span className="vs-result__stat"><strong>{result.num_nodes}</strong> Nodes</span>
          <span className="vs-result__divider" />
          <span className="vs-result__stat"><strong>{result.num_edges}</strong> Edges</span>
          <span className="vs-result__divider" />
          <span className="vs-result__stat">
            DAG:&nbsp;<strong>{result.is_dag ? 'Yes ✓' : 'No ✕'}</strong>
          </span>
          <button className="vs-result__close" onClick={() => setResult(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {error && (
        <div className="vs-result vs-result--error" role="status">
          ⚠ {error} — is the backend running on :8000?
          <button className="vs-result__close" onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}
    </div>
  );
};
