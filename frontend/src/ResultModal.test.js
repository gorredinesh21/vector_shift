// Tests that the result modal displays num_nodes, num_edges, is_dag (deliverable N11).
import { render, screen } from '@testing-library/react';
import { ResultModal } from './ResultModal';

test('displays the three values for a valid DAG', () => {
  render(
    <ResultModal result={{ num_nodes: 5, num_edges: 4, is_dag: true }} error={null} onClose={() => {}} />
  );
  expect(screen.getByText('5')).toBeInTheDocument();      // num_nodes
  expect(screen.getByText('4')).toBeInTheDocument();      // num_edges
  expect(screen.getByText('Yes')).toBeInTheDocument();    // is_dag
  expect(screen.getByText(/valid pipeline/i)).toBeInTheDocument();
});

test('shows a cycle message when not a DAG', () => {
  render(
    <ResultModal result={{ num_nodes: 3, num_edges: 3, is_dag: false }} error={null} onClose={() => {}} />
  );
  expect(screen.getByText('No')).toBeInTheDocument();     // is_dag false
  expect(screen.getAllByText(/cycle/i).length).toBeGreaterThan(0);
});

test('shows an error message on failure', () => {
  render(<ResultModal result={null} error="Server responded with 500" onClose={() => {}} />);
  expect(screen.getByText(/server responded with 500/i)).toBeInTheDocument();
});
