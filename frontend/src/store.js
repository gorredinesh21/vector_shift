// store.js

import { create } from "zustand";
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    MarkerType,
  } from 'reactflow';

// styling applied to every new edge so connections are bright + clearly arrowed
const EDGE_COLOR = '#b83248';
const edgeOptions = {
  type: 'deletable',
  animated: true,
  style: { stroke: EDGE_COLOR, strokeWidth: 2.5 },
  markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22, color: EDGE_COLOR },
};

// deep-ish clone of the current graph so history snapshots aren't corrupted by
// later in-place mutations (e.g. updateNodeField mutates node.data)
const snapshotOf = (nodes, edges) => ({
  nodes: nodes.map((n) => ({ ...n, data: { ...n.data }, position: { ...n.position } })),
  edges: edges.map((e) => ({ ...e })),
});

export const useStore = create((set, get) => ({
    nodes: [],
    edges: [],
    past: [],
    future: [],

    // ── history ──────────────────────────────────────────────────────────
    // record the current graph before a structural change so it can be undone
    takeSnapshot: () => {
      set((s) => ({
        past: [...s.past, snapshotOf(s.nodes, s.edges)].slice(-100),
        future: [], // a new action invalidates the redo stack
      }));
    },
    undo: () => {
      const { past, nodes, edges, future } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      set({
        past: past.slice(0, -1),
        future: [snapshotOf(nodes, edges), ...future],
        nodes: previous.nodes,
        edges: previous.edges,
      });
    },
    redo: () => {
      const { past, nodes, edges, future } = get();
      if (future.length === 0) return;
      const next = future[0];
      set({
        past: [...past, snapshotOf(nodes, edges)],
        future: future.slice(1),
        nodes: next.nodes,
        edges: next.edges,
      });
    },

    getNodeID: (type) => {
        const newIDs = {...get().nodeIDs};
        if (newIDs[type] === undefined) {
            newIDs[type] = 0;
        }
        newIDs[type] += 1;
        set({nodeIDs: newIDs});
        return `${type}-${newIDs[type]}`;
    },
    addNode: (node) => {
        get().takeSnapshot();
        set({
            nodes: [...get().nodes, node]
        });
    },
    onNodesChange: (changes) => {
      // snapshot before a delete so it can be undone (ignore drag/select churn)
      if (changes.some((c) => c.type === 'remove')) get().takeSnapshot();
      set({
        nodes: applyNodeChanges(changes, get().nodes),
      });
    },
    onEdgesChange: (changes) => {
      if (changes.some((c) => c.type === 'remove')) get().takeSnapshot();
      set({
        edges: applyEdgeChanges(changes, get().edges),
      });
    },
    onConnect: (connection) => {
      get().takeSnapshot();
      set({
        edges: addEdge({ ...connection, ...edgeOptions }, get().edges),
      });
    },
    // remove a single edge by id (used by the on-edge delete button)
    removeEdge: (id) => {
      get().takeSnapshot();
      set({ edges: get().edges.filter((e) => e.id !== id) });
    },
    updateNodeField: (nodeId, fieldName, fieldValue) => {
      set({
        nodes: get().nodes.map((node) => {
          if (node.id === nodeId) {
            node.data = { ...node.data, [fieldName]: fieldValue };
          }

          return node;
        }),
      });
    },
    // Drop edges pointing at a target handle on `nodeId` that no longer exists.
    // Used by the Text node when a {{ variable }} (and its handle) is removed.
    removeEdgesToMissingHandles: (nodeId, validHandleIds) => {
      set({
        edges: get().edges.filter(
          (e) => e.target !== nodeId || validHandleIds.includes(e.targetHandle)
        ),
      });
    },
  }));
