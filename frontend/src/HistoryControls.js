// HistoryControls.js
// Undo / Redo buttons in the header. They call the same store actions as the
// Ctrl+Z / Ctrl+Y shortcuts, and disable when there's nothing to undo/redo.

import { Undo2, Redo2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from './store';

const selector = (s) => ({
  undo: s.undo,
  redo: s.redo,
  canUndo: s.past.length > 0,
  canRedo: s.future.length > 0,
});

export const HistoryControls = () => {
  const { undo, redo, canUndo, canRedo } = useStore(useShallow(selector));

  return (
    <div className="vs-history">
      <button
        type="button"
        className="vs-icon-btn"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <Undo2 size={16} />
      </button>
      <button
        type="button"
        className="vs-icon-btn"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
      >
        <Redo2 size={16} />
      </button>
    </div>
  );
};
