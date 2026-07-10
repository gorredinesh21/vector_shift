// NodeIO.js — popover showing a node's inputs/outputs after a run.
import { X } from 'lucide-react';
import { useStore } from './store';

const fmt = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
};

export function NodeIO({ nodeId, onClose }) {
  const result = useStore((s) => s.runResults[nodeId]);

  return (
    <div className="vs-io" onClick={(e) => e.stopPropagation()}>
      <div className="vs-io__head">
        <span>Node I/O{result ? ` · ${result.status}` : ''}</span>
        <button className="vs-io__close" onClick={onClose} aria-label="Close"><X size={13} /></button>
      </div>

      {!result ? (
        <p className="vs-io__empty">Run the pipeline to see this node's inputs and outputs.</p>
      ) : (
        <>
          {result.error && <pre className="vs-io__error">{result.error}</pre>}
          <div className="vs-io__label">Inputs</div>
          <pre className="vs-io__block">{fmt(result.inputs)}</pre>
          <div className="vs-io__label">Outputs</div>
          <pre className="vs-io__block">{fmt(result.outputs)}</pre>
        </>
      )}
    </div>
  );
}
