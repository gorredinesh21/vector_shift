// RunButton.js — executes the pipeline with LIVE per-node status (SSE stream).
import { useState } from 'react';
import { Play } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from './store';
import { runPipelineStream } from './api';

const selector = (s) => ({
  nodes: s.nodes,
  edges: s.edges,
  setRunStatus: s.setRunStatus,
  setRunResults: s.setRunResults,
  setNodeRunStatus: s.setNodeRunStatus,
  clearRun: s.clearRun,
  runStatus: s.runStatus,
});

export const RunButton = () => {
  const {
    nodes, edges, setRunStatus, setRunResults, setNodeRunStatus, clearRun, runStatus,
  } = useStore(useShallow(selector));
  const [error, setError] = useState(null);

  const handleRun = async () => {
    setError(null);
    clearRun();
    setRunStatus('running');
    console.log('[VectorShift] running pipeline:', { nodes, edges });

    try {
      await runPipelineStream(nodes, edges, (ev) => {
        if (ev.event === 'node_start') {
          setNodeRunStatus(ev.id, 'running');           // light it up
        } else if (ev.event === 'node') {
          setNodeRunStatus(ev.id, ev.status, ev.result); // done / skipped / error
        } else if (ev.event === 'complete') {
          console.log('[VectorShift] run complete:', ev);
          setRunResults(ev.results || {}, ev.final || {});
          const anyError = Object.values(ev.results || {}).some((r) => r.status === 'error');
          setRunStatus(anyError ? 'error' : 'done');
        }
      });
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
