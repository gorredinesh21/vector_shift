// api.js — one place for all backend calls.
const BASE = 'http://localhost:8000';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Server responded with ${res.status}`);
  return res.json();
}

// Part 4: node/edge count + DAG check
export const parsePipeline = (nodes, edges) => post('/pipelines/parse', { nodes, edges });

// Execute the whole pipeline; returns { results: {nodeId:{inputs,outputs,status,error}}, final }
export const runPipeline = (nodes, edges) => post('/pipelines/run', { nodes, edges });

// Persistence
export const savePipeline = (name, graph) => post('/pipelines', { name, graph });
