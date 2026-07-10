// BaseNode.js
// The single, reusable node shell. Every node type is described by a config
// object of { type, title, category, icon, handles[], fields[] } and rendered
// here. Adding a new node = adding a config (see definitions.js) — this file
// never needs to change.
//
// Escape hatch: a config may provide `renderBody({ id, data, values, setField })`
// to take over the body for nodes too custom for plain fields (e.g. the Text
// node's dynamic-variable logic in Part 3).

import { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import * as Icons from 'lucide-react';
import { useStore } from '../store';
import { NodeField } from './NodeField';
import { NodeIO } from '../NodeIO';

const sideToPosition = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

// allow a field default to be a function of the node id (e.g. auto-naming inputs)
const resolveDefault = (def, id) => (typeof def === 'function' ? def(id) : def);

// default node footprint; content scales relative to this as the node grows
const BASE_W = 220;
const BASE_H = 110;

export function BaseNode({ id, data, config }) {
  const updateNodeField = useStore((s) => s.updateNodeField);
  const takeSnapshot = useStore((s) => s.takeSnapshot);
  const rootRef = useRef(null);

  // scale the node's text/content with its size, so a bigger box = bigger text
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const scale = Math.max(0.85, Math.min(Math.sqrt((w / BASE_W) * (h / BASE_H)), 2.6));
      el.style.setProperty('--node-scale', scale.toFixed(3));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [values, setValues] = useState(() => {
    const init = {};
    (config.fields || []).forEach((f) => {
      init[f.name] = data?.[f.name] ?? resolveDefault(f.default, id) ?? '';
    });
    return init;
  });

  const setField = (name, val) => {
    setValues((v) => ({ ...v, [name]: val }));
    updateNodeField(id, name, val); // keep the store in sync so Part 4 submit sees it
  };

  // run state for this node (populated after a Run)
  const runResult = useStore((s) => s.runResults[id]);
  const [showIO, setShowIO] = useState(false);

  // group handles by side so multiple handles on the same edge space evenly
  const handlesBySide = {};
  (config.handles || []).forEach((h) => {
    (handlesBySide[h.side] = handlesBySide[h.side] || []).push(h);
  });

  const Icon = config.icon && Icons[config.icon] ? Icons[config.icon] : null;

  return (
    <div ref={rootRef} className={`vs-node vs-node--${config.category || 'default'}`}>
      <NodeResizer
        minWidth={180}
        minHeight={70}
        onResizeStart={takeSnapshot}
        lineClassName="vs-resize-line"
        handleClassName="vs-resize-handle"
      />
      <div className="vs-node__title" title={config.description}>
        {Icon ? <Icon size={15} className="vs-node__icon" /> : null}
        <span>{config.title}</span>
        {runResult ? <span className={`vs-node__dot vs-node__dot--${runResult.status}`} title={runResult.status} /> : null}
        <button
          className="vs-node__io nodrag"
          onClick={(e) => { e.stopPropagation(); setShowIO((v) => !v); }}
          title="View inputs / outputs"
          aria-label="View inputs and outputs"
        >
          <Icons.Info size={13} />
        </button>
      </div>

      {showIO ? <NodeIO nodeId={id} onClose={() => setShowIO(false)} /> : null}

      <div className="vs-node__body">
        {config.renderBody
          ? config.renderBody({ id, data, values, setField })
          : (config.fields || []).map((f) => (
              <NodeField
                key={f.name}
                field={f}
                value={values[f.name]}
                onChange={(val) => setField(f.name, val)}
              />
            ))}
      </div>

      {Object.entries(handlesBySide).map(([side, handles]) =>
        handles.map((h, i) => {
          const top = `${((i + 1) * 100) / (handles.length + 1)}%`;
          return (
            <div key={h.id}>
              <Handle
                type={h.type}
                position={sideToPosition[side]}
                id={`${id}-${h.id}`}
                style={{ top }}
              />
              {h.label ? (
                <span className={`vs-handle-label vs-handle-label--${side}`} style={{ top }}>
                  {h.label}
                </span>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
