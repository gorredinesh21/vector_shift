# VectorShift Frontend Technical Assessment — Project Documentation

A complete technical walkthrough of the project: what it is, how it's built, how the four assessment
parts were solved, and the functional pipeline engine I added on top.

---

## 1. Overview

The assessment starter is a bare React (React Flow) + FastAPI scaffold for a **visual pipeline
builder** — drag nodes onto a canvas, wire them into a graph, submit. I completed all four parts and
then took it further: I made the pipelines **actually execute** (LLM calls, RAG over documents, web
research), turning the builder into a working AI-workflow tool.

Context that shaped my choices: VectorShift is the "AI operating system for **private-market
investors**" (founders ex-Blackstone / McKinsey). So I designed the nodes around a real
**private-equity (PE) workflow** — reading CIMs, diligence over data rooms, company research.

**Two layers:**
- **The builder** (the assessment): abstraction, styling, dynamic Text node, backend DAG check.
- **The runner** (beyond the brief): an execution engine that runs the graph node-by-node.

---

## 2. Tech stack

| Layer | Tech |
|-------|------|
| Frontend | JavaScript, **React 18**, **React Flow** (canvas), **Zustand** (state), **lucide-react** (icons) |
| Backend | Python, **FastAPI** + Uvicorn |
| AI | **Hugging Face Inference API** — LLM (chat) + embeddings (feature-extraction) |
| RAG store | Lightweight local **NumPy** vector store (JSON per document) |
| Web research | **DuckDuckGo** search (`ddgs`, no key) + **httpx**/**BeautifulSoup** scraping |
| Persistence | **SQLite** (saved pipelines, run history, context registry) |
| Doc parsing | `pypdf`, `python-docx`, `pandas` |

---

## 3. Repository structure

```
frontend/src/
  App.js               header (Run/Submit/Guide/Pipelines) + layout
  ui.js                React Flow canvas, drop handling, edge types, delete keys, undo/redo shortcuts
  store.js             Zustand: nodes, edges, history (undo/redo), run state, save/load
  api.js               all backend calls in one place
  submit.js            Part 4 submit (DAG check) → floating result banner
  RunButton.js         executes the pipeline with live SSE status
  NodeIO.js            per-node input/output viewer (modal)
  NodeGuide.js         in-app node documentation
  PipelinesPanel.js    save / load pipelines
  DeletableEdge.js     edge with hover ✕ delete
  nodes/
    BaseNode.js        the reusable node shell (renders any node from config)
    NodeField.js       renders a field by kind
    definitions.js     the whole node catalog as data
    index.js           builds React Flow nodeTypes from definitions
    textNode.js        Text node body (Part 3 dynamic logic)
    ContextSearchBody.js  Context Search body (existing-DB dropdown)

backend/
  main.py              endpoints: /pipelines/parse (Part 4), /pipelines/run(+/stream), save/load, runs, contexts
  config.py            settings from .env
  schemas.py           Pydantic request/response
  db.py                SQLite: pipelines, runs, contexts
  engine/
    executor.py        DAG execution engine (topo sort, branch-skip, error isolation, SSE events)
    registry.py        node type → executor (decorator)
    handles.py         handle-id helpers
  services/
    hf_llm.py          LLM over HF API (retry/backoff)
    hf_embeddings.py   embeddings over HF API (retry)
    vectorstore.py     NumPy vector store (chunk, embed, cosine top-k)
    search.py          DuckDuckGo (news+blogs first) + LLM-URL fallback
    scraper.py         concurrent scraping (asyncio + httpx + BeautifulSoup)
    parsers.py         pdf/docx/csv → text
    structured.py      force + parse structured LLM output (boolean/JSON/list)
  nodes/               executors: io, text, logic, llm, documents, web, note
  scripts/check_models.py   probe which HF models the token can reach
```

---

## 4. How to run

```bash
# backend
cd backend
pip install -r requirements.txt
python scripts/check_models.py          # pick a reachable HF model → set HF_LLM_MODEL in .env
uvicorn main:app --reload               # http://localhost:8000

# frontend
cd frontend
npm install
npm start                               # http://localhost:3000
```
`.env` (git-ignored) holds `HF_TOKEN`, the model ids, and store paths. The **builder + DAG check work
with no AI setup**; only the **Run** (execution) needs a valid HF model.

---

## 5. The assessment — how each part was solved

### Part 1 — Node Abstraction
**Problem:** the four node files shared most of their code and differed only in title/fields/handles;
copying a file per new node doesn't scale.

**Solution — a config-driven (data-driven) abstraction.** A node is a plain **config object**
`{ type, title, category, icon, handles[], fields[] }`; one `BaseNode` component renders any node from
it, and `NodeField` renders each field by `kind` (`text | textarea | select | number | slider |
checkbox`). The catalog lives in one `definitions.js`; the `nodeTypes` map and toolbar are generated
from it — **adding a node = one object, zero `BaseNode` edits**. An **escape hatch** (`renderBody`)
handles nodes too custom for plain fields (the Text node). I chose config over compound-components /
HOCs / render-props / hooks because it scored highest on reusability, ease of use, and low learning
curve, and matches the brief's goal (speed up new nodes + centralize styling). *(Details in §6.)*

### Part 2 — Styling
**Problem:** no meaningful styling; needs an appealing, unified design.

**Solution:** one design system driven by shared CSS-variable **tokens** (color, radius, spacing) so
every surface is consistent — light warm-gradient canvas, **frosted-glass** node cards, a single
**maroon** accent, airy spacing, Inter font, a **bottom** toolbar, glass header. **Handles are
color-coded** (inputs blue, outputs maroon) so connections are obvious; edges are bright animated
maroon with arrowheads; the MiniMap and Controls are themed. Nodes are **resizable** and their content
**scales with size** (a `ResizeObserver` sets `--node-scale`; text uses `em`).

### Part 3 — Text Node Logic
**Problem:** the Text node should (a) auto-resize as you type, and (b) turn `{{ variable }}` into a
left-side input handle.

**Solution:**
- **Auto-resize:** a `<textarea>` grows to fit content (`scrollHeight`, clamped).
- **Dynamic handles:** extract `{{ ... }}` with a **non-greedy regex**, **validate** each as a JS
  identifier (`/^[A-Za-z_$][A-Za-z0-9_$]*$/`), **de-duplicate** with a `Set`, render one left target
  handle per variable (spaced, labelled), and call React Flow's **`useUpdateNodeInternals`** so new
  handles are connectable (RF caches handle positions otherwise). Removed variables' edges are pruned;
  text is persisted to the store.

### Part 4 — Backend Integration
**Problem:** submit the graph to `/pipelines/parse`; return `{num_nodes, num_edges, is_dag}`; show it.

**Solution:**
- **Frontend:** `submit.js` POSTs `{nodes, edges}` to `/pipelines/parse`.
- **Backend:** returns counts and `is_dag` via **Kahn's algorithm** (topological sort — build
  in-degrees, peel zero-in-degree nodes; acyclic iff all removed, so cycles/self-loops → `false`).
  **CORS** is enabled for `localhost:3000`.
- **Result:** a themed **floating banner** shows Nodes / Edges / DAG (Yes/No); the graph and response
  are console-logged. Verified with `pytest` over linear/diamond/disconnected/cycle/self-loop graphs
  and an RTL submit test.

---

## 6. The node abstraction (deep dive)

A node's entire definition is data:
```js
{
  type: 'condition',
  title: 'Condition',
  category: 'logic',          // drives icon color / accent
  icon: 'GitBranch',          // any lucide icon
  description: '…',           // shown in tooltips + the in-app Node Guide
  handles: [                  // connection points
    { id: 'input', type: 'target', side: 'left' },
    { id: 'true',  type: 'source', side: 'right', label: 'True' },
    { id: 'false', type: 'source', side: 'right', label: 'False' },
  ],
  fields: [                   // editable inputs
    { name: 'condition', label: 'Condition', kind: 'text' },
  ],
  // renderBody?(props)        // escape hatch for custom bodies
}
```
- `BaseNode` renders the title (icon + category tint), the body (fields via `NodeField`, or
  `renderBody`), and the handles (auto-spaced per side, with labels). Field values are synced to the
  Zustand store so submit/run see them.
- `index.js` turns each config into a component `(props) => <BaseNode {...props} config={cfg} />`,
  producing `nodeTypes`. The toolbar and Node Guide iterate the same list — **one source of truth**.

**Why config-driven:** adding a node never touches `BaseNode`; styling is central; anyone can read a
plain object. The `renderBody` hatch removes its only weakness (the odd custom node), so it keeps
config's simplicity for the 95% case and full flexibility for the exception.

---

## 7. Node catalog

Core (refactored onto the abstraction): **Input, Output, LLM, Text.**
New (built for a PE + RAG workflow):

| Node | Purpose | Inputs → Outputs |
|------|---------|------------------|
| **Condition** | LLM judges a rule → routes True/False | input → true \| false |
| **Merge** | Combine branches (Pick First / Join All) | path1, path2 → output |
| **Filter List** | LLM keeps/drops list items by a predicate | list → output |
| **Document Loader** | Parse a CIM/financials/contract file → text | — → document |
| **Context Builder** | Chunk + embed a document → a vector store (RAG index) | documents → context |
| **Context Search** | Retrieve top-k chunks for a query (or a saved DB) | context, query → results |
| **Web Scraper** | Research a topic: search (news+blogs first) → scrape → summarize | query → summary |
| **Note** | Canvas annotation (no handles) | — |

These also stress-test the abstraction: multiple outputs (Condition), multiple inputs (Merge), varied
field kinds (Context Builder), and the zero-handle case (Note).

---

## 8. The execution engine (beyond the brief)

Clicking **Run** sends the graph to `/pipelines/run` (or `/run/stream`). The engine
(`engine/executor.py`):
1. **Topologically sorts** the graph (reuses the DAG logic).
2. For each node, **resolves inputs** from upstream outputs (matched by edge handle ids), calls that
   node's **executor** `execute(inputs, config) -> outputs`, and stores the result.
3. Handles **branching** (a Condition emits on only the True *or* False handle; downstream nodes with
   no input are marked **skipped**) and **isolates errors** (a failing node is reported, the run
   continues).
4. Streams **live per-node status** via **SSE** (plain HTTP, not WebSockets) — the running node lights
   up on the canvas; finished nodes show green/grey/red.

**Design principle:** the orchestrator is *dumb and deterministic*; intelligence lives inside nodes.
Each node is a small function registered by a decorator (`@register("type")`).

### RAG (Context Builder / Context Search)
- **Build:** chunk the document text (~700 chars, 100 overlap) → embed **each chunk** via the HF API →
  store `{chunks, embeddings}` as **one JSON file per document** (`backend/chroma_store/doc_*.json`).
- **Search:** embed the query → **NumPy cosine similarity** vs the stored vectors → top-7 chunks.
- I deliberately **replaced Chroma with a NumPy/JSON store** — Chroma downloaded a default ONNX model
  and ran telemetry on first use, which froze the laptop even for a 1-page PDF. The NumPy store has no
  downloads/telemetry, so it's fast and light; embeddings still go through the HF API.
- Context Search can use a **wired** Context Builder *or* a **saved DB** selected from a dropdown.

### Web Scraper
Topic → **DuckDuckGo news vertical** (news first) + general search with **blog-style URLs bumped up**
→ scrape ≤10 sites **concurrently** (asyncio + httpx, per-site error isolation, BeautifulSoup text
extraction) → **LLM summarizes** the pages (cites sources). Falls back to LLM-proposed URLs if search
fails.

### LLM & structured output
LLM/embeddings use the HF Inference API with **retry/backoff** on cold-model 503s. Because open models
don't always return clean output, `structured.py` **forces and defensively parses** booleans/JSON/lists
(used by Condition's YES/NO judge and Filter's keep/drop decisions).

---

## 9. Extra features
- **Undo / Redo** — `Ctrl+Z` / `Ctrl+Y` + header buttons, backed by a history stack; ignored while
  typing so native text-undo still works.
- **Delete connections** — select + Delete, or a hover ✕ on the edge.
- **Bright, color-coded handles + edges**; **resizable nodes** with scaling content.
- **In-app Node Guide** + hover tooltips (generated from the node definitions).
- **Per-node I/O viewer** (ⓘ) — inspect each node's inputs/outputs after a run.
- **Live run status** (SSE) — the current node lights up.
- **Save / Load pipelines** (SQLite) + run history + context registry.

---

## 10. Testing & verification
During development the project was verified with automated tests (all passing):
- **Backend (`pytest`)** — the engine (linear flow, branch-skipping, error isolation, Output
  collection), pure nodes (Text/Merge/IO), structured-output parsing, and the DAG endpoint over
  linear / diamond / disconnected / cycle / self-loop graphs.
- **Frontend (React Testing Library)** — the submit flow and the store's undo/redo.
- **`check_models.py`** confirms which HF models the token can actually reach before running.

The end-to-end RAG pipeline (Document Loader → Context Builder → Context Search → LLM → Output) was
also exercised manually against sample CIM PDFs.

---

## 11. Key design decisions (and why)
- **Config-driven nodes** — reusability + one source of truth; the `renderBody` hatch keeps it flexible.
- **Custom DAG engine, not LangGraph** — the pipeline *is* a graph; a dumb, deterministic executor is
  more predictable than a framework, and nodes stay small functions.
- **Official clients (huggingface_hub, ddgs, httpx) over LangChain** — fewer moving parts and less
  version churn for what are, in this design, a few direct calls.
- **Lazy heavy imports** — the backend loads and basic nodes run even if optional AI libs aren't
  installed; only the node that needs a lib errors, with a clear message.
- **NumPy store over Chroma** — removes the freeze from Chroma's ONNX download + telemetry.
- **SSE over WebSockets** for live status — simpler, plain HTTP, no extra infra.

---

## 12. Notes / limitations
- Node execution uses the **HF Inference API**; big/gated models may 503 (retry handles transient
  loading). `check_models.py` picks a reachable one.
- Embedding is **one API call per chunk (sequential)**, so very large documents are slow to index
  (retrieval and the LLM step are bounded — only 7 chunks reach the model).
- The web scraper sees **static HTML** only (JS-heavy pages return little); blog detection is a URL
  heuristic.
- Document Loader reads a **local file path** typed into the node (no upload UI).
