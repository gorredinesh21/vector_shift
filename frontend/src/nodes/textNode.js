// textNode.js
// Custom body for the Text node, plugged into BaseNode via the `renderBody`
// escape hatch (see definitions.js).
//
// Part 3 features:
//   1. Auto-resize — the textarea (and thus the node) grows to fit the text.
//   2. Dynamic variables — typing a valid JS identifier inside {{ }} adds a
//      matching input Handle on the left edge, live.

import { useEffect, useMemo, useRef } from 'react';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { useStore } from '../store';

// a valid JavaScript identifier: starts with letter/_/$, then alphanumerics/_/$
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function TextNodeBody({ id, values, setField }) {
  const text = values.text ?? '';
  const textareaRef = useRef(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const removeEdgesToMissingHandles = useStore((s) => s.removeEdgesToMissingHandles);

  // 1) extract every {{ ... }} (non-greedy, all matches), trim, validate, dedupe
  const variables = useMemo(() => {
    const found = [...text.matchAll(/\{\{([^}]*)\}\}/g)].map((m) => m[1].trim());
    return [...new Set(found.filter((v) => IDENTIFIER.test(v)))];
  }, [text]);

  // 2) auto-resize the textarea to fit its content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 48), 240)}px`;
  }, [text]);

  // 3) when the variable set changes: tell React Flow to re-measure the handles
  //    (so new handles are connectable) and prune edges to removed handles
  const varsKey = variables.join(',');
  useEffect(() => {
    updateNodeInternals(id);
    const validIds = variables.map((v) => `${id}-${v}`);
    removeEdgesToMissingHandles(id, validIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varsKey, id]);

  return (
    <div className="vs-textnode">
      <label className="vs-field">
        <span className="vs-field__label">Text</span>
        <textarea
          ref={textareaRef}
          className="vs-input vs-textnode__area nodrag"
          value={text}
          onChange={(e) => setField('text', e.target.value)}
        />
      </label>

      {variables.map((v, i) => {
        const top = `${((i + 1) * 100) / (variables.length + 1)}%`;
        return (
          <div key={v}>
            <Handle type="target" position={Position.Left} id={`${id}-${v}`} style={{ top }} />
            <span className="vs-handle-label vs-handle-label--left" style={{ top }}>{v}</span>
          </div>
        );
      })}
    </div>
  );
}
