// Tests the full submit flow (deliverable N6 + N11): clicking Submit POSTs the
// pipeline and the alert (modal) triggers on the response showing the 3 values.
import { render, screen, fireEvent } from '@testing-library/react';
import { SubmitButton } from './submit';
import { useStore } from './store';

beforeEach(() => {
  // seed the store with a small pipeline (2 nodes, 1 edge)
  useStore.setState({
    nodes: [{ id: 'a' }, { id: 'b' }],
    edges: [{ source: 'a', target: 'b', sourceHandle: 'a-out', targetHandle: 'b-in' }],
  });
});

afterEach(() => {
  delete global.fetch;
});

test('POSTs {nodes, edges} and shows a modal with num_nodes, num_edges, is_dag', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ num_nodes: 2, num_edges: 1, is_dag: true }),
  });

  render(<SubmitButton />);
  fireEvent.click(screen.getByRole('button', { name: /submit pipeline/i }));

  // the alert/modal triggers on the response and shows the values
  expect(await screen.findByText('2')).toBeInTheDocument();  // num_nodes
  expect(screen.getByText('1')).toBeInTheDocument();          // num_edges
  expect(screen.getByText('Yes')).toBeInTheDocument();        // is_dag

  // it POSTed the pipeline correctly
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [url, opts] = global.fetch.mock.calls[0];
  expect(url).toMatch(/\/pipelines\/parse$/);
  expect(opts.method).toBe('POST');
  const sent = JSON.parse(opts.body);
  expect(sent.nodes).toHaveLength(2);
  expect(sent.edges).toHaveLength(1);
});

test('shows an error modal when the backend is unreachable', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

  render(<SubmitButton />);
  fireEvent.click(screen.getByRole('button', { name: /submit pipeline/i }));

  expect(await screen.findByText(/failed to fetch/i)).toBeInTheDocument();
});
