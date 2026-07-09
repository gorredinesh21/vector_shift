// ui.js
// Displays the drag-and-drop UI
// --------------------------------------------------

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactFlow, { Controls, Background, MiniMap } from 'reactflow';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { nodeTypes } from './nodes';
import { DeletableEdge } from './DeletableEdge';

import 'reactflow/dist/style.css';

const gridSize = 20;
const proOptions = { hideAttribution: true };
const edgeTypes = { deletable: DeletableEdge };
const deleteKeyCodes = ['Backspace', 'Delete'];

const selector = (state) => ({
  nodes: state.nodes,
  edges: state.edges,
  getNodeID: state.getNodeID,
  addNode: state.addNode,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  takeSnapshot: state.takeSnapshot,
  undo: state.undo,
  redo: state.redo,
});

export const PipelineUI = () => {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const {
    nodes,
    edges,
    getNodeID,
    addNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    takeSnapshot,
    undo,
    redo,
  } = useStore(useShallow(selector));

  // Undo (Ctrl/Cmd+Z) and Redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z).
  // Skip when typing in a field so the browser's native text undo still works.
  useEffect(() => {
    const onKeyDown = (e) => {
      const t = e.target;
      const typing =
        t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable;
      if (typing) return;
      if (!(e.ctrlKey || e.metaKey)) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const getInitNodeData = (nodeID, type) => {
    let nodeData = { id: nodeID, nodeType: `${type}` };
    return nodeData;
  }

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      if (event?.dataTransfer?.getData('application/reactflow')) {
        const appData = JSON.parse(event.dataTransfer.getData('application/reactflow'));
        const type = appData?.nodeType;

        // check if the dropped element is valid
        if (typeof type === 'undefined' || !type) {
          return;
        }

        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const nodeID = getNodeID(type);
        const newNode = {
          id: nodeID,
          type,
          position,
          data: getInitNodeData(nodeID, type),
        };

        addNode(newNode);
      }
    },
    [reactFlowInstance]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // snapshot once at the start of a node drag so the move can be undone
  const onNodeDragStart = useCallback(() => takeSnapshot(), [takeSnapshot]);

  return (
    <>
      <div ref={reactFlowWrapper} style={{ width: '100%', height: '70vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={onNodeDragStart}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          deleteKeyCode={deleteKeyCodes}
          proOptions={proOptions}
          snapGrid={[gridSize, gridSize]}
          connectionLineType='smoothstep'
        >
          <Background color="#d9c7cc" gap={gridSize} />
          <Controls />
          <MiniMap
            nodeColor="#b83248"
            nodeStrokeColor="#8c2f39"
            nodeBorderRadius={3}
            maskColor="rgba(140, 47, 57, 0.12)"
            pannable
            zoomable
          />
        </ReactFlow>
      </div>
    </>
  )
}
