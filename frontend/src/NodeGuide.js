// NodeGuide.js
// An in-app reference of every node: icon, name, description, and its
// inputs/outputs. Opened from the "Guide" button in the header.

import * as Icons from 'lucide-react';
import { nodeDefinitions } from './nodes';

const inputs = (handles) =>
  handles.filter((h) => h.type === 'target').map((h) => h.label || h.id);
const outputs = (handles) =>
  handles.filter((h) => h.type === 'source').map((h) => h.label || h.id);

export function NodeGuide({ onClose }) {
  return (
    <div className="vs-modal__overlay" onClick={onClose}>
      <div className="vs-guide" onClick={(e) => e.stopPropagation()}>
        <div className="vs-guide__head">
          <div className="vs-modal__title">Node Guide</div>
          <button type="button" className="vs-icon-btn" onClick={onClose} aria-label="Close" title="Close">
            <Icons.X size={16} />
          </button>
        </div>
        <p className="vs-guide__intro">
          Drag any node from the bottom toolbar onto the canvas, then wire outputs (right) into
          inputs (left). Here's what each node does.
        </p>

        <div className="vs-guide__list">
          {nodeDefinitions.map((n) => {
            const Icon = n.icon && Icons[n.icon] ? Icons[n.icon] : null;
            const ins = inputs(n.handles);
            const outs = outputs(n.handles);
            return (
              <div key={n.type} className={`vs-guide__item vs-node--${n.category}`}>
                <div className="vs-guide__title">
                  {Icon ? <Icon size={16} className="vs-guide__icon" /> : null}
                  <span>{n.title}</span>
                </div>
                <p className="vs-guide__desc">{n.description}</p>
                <div className="vs-guide__io">
                  <span><strong>In:</strong> {ins.length ? ins.join(', ') : '—'}</span>
                  <span><strong>Out:</strong> {outs.length ? outs.join(', ') : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
