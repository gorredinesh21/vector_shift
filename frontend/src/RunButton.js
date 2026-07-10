// RunButton.js — executes the whole pipeline on the backend and stores results.
import { useState } from 'react';
import { Play } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from './store';
import { runPipeline } from './api';

const selector = (s) => ({
  nodes: s.nodes,
  edges: s.edges,
  setRunStatus: s.setRunStatus,
  setRunResults: s.setRunResults,
  runStatus: s.runStatus,
});

export const RunButton = () => {
  const { nodes, edges, setRunStatus, setRunResults, runStatus } = useStore(useShallow(selector));
  const [error, setError] = useState(null);

  const handleRun = async () => {
    setError(null);
    setRunStatus('running');
    console.log('[VectorShift] running pipeline:', { nodes, edges });
    try {
      const data = await runPipeline(nodes, edges);
      console.log('[VectorShift] run results:', data);
      setRunResults(data.results || {}, data.final || {});
      const anyError = Object.values(data.results || {}).some((r) => r.status === 'error');
      setRunStatus(anyError ? 'error' : 'done');
    } catch (e) {
      console.error('[VectorShift] run failed:', e);
      setError(e.message || 'Run failed');
      setRunStatus('error');
    }
  };

  return (
    <div className="vs-run">
      <button
        type="button"
        className="vs-run__btn"
        onClick={handleRun}
        disabled={runStatus === 'running'}
        title="Run the pipeline"
      >
        <Play size={15} />
        {runStatus === 'running' ? 'Running…' : 'Run'}
      </button>
      {error && <span className="vs-run__error">⚠ {error}</span>}
    </div>
  );
};
