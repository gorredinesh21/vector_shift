// Tests for the store's history (undo/redo) and edge removal.
import { useStore } from './store';

beforeEach(() => {
  useStore.setState({ nodes: [], edges: [], past: [], future: [], nodeIDs: {} });
});

const node = (id) => ({ id, type: 'text', position: { x: 0, y: 0 }, data: {} });

test('addNode is undoable and redoable', () => {
  useStore.getState().addNode(node('a'));
  expect(useStore.getState().nodes).toHaveLength(1);

  useStore.getState().undo();
  expect(useStore.getState().nodes).toHaveLength(0);

  useStore.getState().redo();
  expect(useStore.getState().nodes).toHaveLength(1);
});

test('removeEdge deletes the edge and can be undone', () => {
  useStore.setState({ edges: [{ id: 'e1', source: 'a', target: 'b' }] });
  useStore.getState().removeEdge('e1');
  expect(useStore.getState().edges).toHaveLength(0);

  useStore.getState().undo();
  expect(useStore.getState().edges).toHaveLength(1);
});

test('undo/redo with empty history are no-ops', () => {
  useStore.getState().undo();
  useStore.getState().redo();
  expect(useStore.getState().nodes).toHaveLength(0);
});

test('a fresh action clears the redo (future) stack', () => {
  useStore.getState().addNode(node('a'));
  useStore.getState().undo();
  expect(useStore.getState().future).toHaveLength(1);

  useStore.getState().addNode(node('b')); // new action
  expect(useStore.getState().future).toHaveLength(0);
});
