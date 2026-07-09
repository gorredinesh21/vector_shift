// toolbar.js
// The node palette. Chips are generated from the data-driven node definitions,
// so a new node added to definitions.js automatically appears here.

import { DraggableNode } from './draggableNode';
import { nodeDefinitions } from './nodes';

export const PipelineToolbar = () => {
  return (
    <div className="vs-toolbar">
      <div className="vs-toolbar__chips">
        {nodeDefinitions.map((def) => (
          <DraggableNode
            key={def.type}
            type={def.type}
            label={def.title}
            icon={def.icon}
            description={def.description}
          />
        ))}
      </div>
    </div>
  );
};
