# VectorShift — Frontend Technical Assessment

## What this assessment is about

VectorShift is a no-code platform for building AI pipelines — you drag **nodes** onto a canvas,
wire their **inputs/outputs** together, and run the resulting **graph**. This assessment takes a
bare-bones React (React Flow) + FastAPI starter and turns it into a polished, extensible pipeline
builder. The work spans four parts: a reusable node abstraction, a cohesive UI, dynamic Text-node
logic, and a frontend↔backend integration that analyzes the pipeline graph.

**Stack:** JavaScript + React 18 + React Flow + Zustand (frontend) · Python + FastAPI (backend).

**Run it:**
```bash
# backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload   # :8000
# frontend
cd frontend && npm install && npm start                                       # :3000
```

---

## The four parts & their requirements

### Part 1 — Node Abstraction
- Create an abstraction that speeds up building new nodes and applying shared styles, instead of
  copy-pasting a whole file per node.
- Build **at least 5 new nodes** to demonstrate the abstraction's flexibility.

### Part 2 — Styling
- Style every component (canvas, toolbar, nodes, handles, edges, button) into an **appealing,
  unified** design.

### Part 3 — Text Node Logic
- The Text node's field should **auto-resize** (width/height) as more text is typed.
- Typing a valid JavaScript variable inside double curly braces (`{{ var }}`) should create a
  matching **input Handle** on the node's left, live.

### Part 4 — Backend Integration
- `submit.js` should POST the pipeline's **nodes and edges** to `/pipelines/parse` on click.
- The backend should return `{ num_nodes: int, num_edges: int, is_dag: bool }` — counting nodes/edges
  and checking whether the graph is a **DAG** (no cycles).
- On response, the frontend should show the three values in a **user-friendly** way.

---

## Deliverables

### Quantitative (objectively verifiable)
| # | Deliverable |
|---|-------------|
| 1 | ≥ 5 new node types built on the abstraction |
| 2 | Text node **width** grows with input |
| 3 | Text node **height** grows with input |
| 4 | One left-side input handle per valid `{{ variable }}` |
| 5 | Only valid JS identifiers create a handle (invalids ignored, duplicates deduped) |
| 6 | Submit POSTs `{ nodes, edges }` to `/pipelines/parse` |
| 7 | Backend returns `num_nodes` (int) |
| 8 | Backend returns `num_edges` (int) |
| 9 | Backend returns `is_dag` (bool) with correct cycle detection |
| 10 | Response matches the exact `{num_nodes, num_edges, is_dag}` shape |
| 11 | The three values are displayed to the user after Submit |

### Qualitative (judged on quality)
| # | Deliverable |
|---|-------------|
| A | The abstraction genuinely reduces per-node code and centralizes styling |
| B | The new nodes are varied enough to showcase the abstraction's flexibility |
| C | The overall design is cohesive, polished, and unified |
| D | The pipeline analysis is presented clearly and understandably |

---

## Documentation
- **`EXECUTION.md`** — what was delivered, how it was built, the abstraction method chosen (and why),
  and the extra features added.
- **`NODES.md`** — the node abstraction explained, how to add a node, and every node's purpose.
- **`HANDOVER.md`** — running/testing notes and per-part status.
