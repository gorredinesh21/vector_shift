// draggableNode.js
// A single draggable chip in the toolbar. On drag start it stashes the node
// `type` into the drag payload; ui.js reads it on drop to create the node.

import * as Icons from 'lucide-react';

export const DraggableNode = ({ type, label, icon, description }) => {
  const onDragStart = (event, nodeType) => {
    const appData = { nodeType };
    event.target.style.cursor = 'grabbing';
    event.dataTransfer.setData('application/reactflow', JSON.stringify(appData));
    event.dataTransfer.effectAllowed = 'move';
  };

  const Icon = icon && Icons[icon] ? Icons[icon] : null;

  return (
    <div
      className={`vs-chip ${type}`}
      title={description}
      onDragStart={(event) => onDragStart(event, type)}
      onDragEnd={(event) => (event.target.style.cursor = 'grab')}
      draggable
    >
      {Icon ? <Icon size={16} className="vs-chip__icon" /> : null}
      <span className="vs-chip__label">{label}</span>
    </div>
  );
};
