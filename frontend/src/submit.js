// submit.js
// Sends the current pipeline (nodes + edges) to the backend and shows the
// analysis (num_nodes, num_edges, is_dag) in a themed modal.

import { useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { ResultModal } from './ResultModal';

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
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setError(e.message || 'Could not reach the backend.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="vs-submit">
      <button type="button" className="vs-submit__btn" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Submitting…' : 'Submit Pipeline'}
      </button>

      {(result || error) && (
        <ResultModal result={result} error={error} onClose={closeModal} />
      )}
    </div>
  );
};
