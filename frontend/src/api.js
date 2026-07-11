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

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Server responded with ${res.status}`);
  return res.json();
}

// list saved contexts/DBs (for the Context Search "existing DB" dropdown)
export const getContexts = () => get('/contexts');

// Part 4: node/edge count + DAG check
export const parsePipeline = (nodes, edges) => post('/pipelines/parse', { nodes, edges });

// Execute the whole pipeline; returns { results: {nodeId:{inputs,outputs,status,error}}, final }
export const runPipeline = (nodes, edges) => post('/pipelines/run', { nodes, edges });

// Execute with LIVE progress. Calls onEvent(ev) for each SSE event:
//   { event:'node_start', id }         a node began (light it up)
//   { event:'node', id, status, result } a node finished
//   { event:'complete', results, final } the whole run finished
export async function runPipelineStream(nodes, edges, onEvent) {
  const res = await fetch(`${BASE}/pipelines/run/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes, edges }),
  });
  if (!res.ok || !res.body) throw new Error(`Server responded with ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop(); // keep the last (possibly incomplete) chunk
    for (const chunk of chunks) {
      const line = chunk.trim();
      if (line.startsWith('data:')) {
        const payload = line.slice(5).trim();
        if (payload) onEvent(JSON.parse(payload));
      }
    }
  }
}

// Persistence
export const savePipeline = (name, graph) => post('/pipelines', { name, graph });
