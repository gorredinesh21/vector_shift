# Presentation

## Part 1 — Node Abstraction

**Problem.** The `nodes/` folder had four node types (Input, Output, LLM, Text), each in its own
file. They shared most of their code — the same wrapper markup, inline styles, `useState` field
logic, and `<Handle>` boilerplate — and differed only in title, fields, and handles. Creating a new
node meant copying a whole file and editing it; a style change meant editing every file. Fine for 4
nodes, unmaintainable as they grow.

**How I solved it — a config-driven (data-driven) abstraction.**
- One reusable component, `BaseNode`, renders *any* node from a plain **config object**:
  `{ type, title, category, icon, handles[], fields[] }`.
- `NodeField` renders each field by `kind`: `text | textarea | select | number | slider | checkbox`.
- The whole catalog lives in one `definitions.js` list; the React Flow `nodeTypes` map and the
  toolbar chips are **generated** from it. Adding a node = add one object, **zero edits to `BaseNode`**.
- **Escape hatch:** a config can supply `renderBody(...)` for nodes too custom for plain fields
  (used by the Text node's dynamic-variable logic).

**Which method & why.** I chose **props-configuration (data-driven)** over the other React patterns
(compound components, HOCs, render props, hooks). I judged them on three criteria — reusability,
ease of use, low learning curve — and config won: a node becomes *data*, not code, so new nodes are
trivial, styling is centralized in one place, and there's a single source of truth (definitions →
nodes + toolbar + docs). It directly matches the brief: "speed up creating new nodes and apply
styles across nodes."

**The extra nodes (built 8, not 5).** Condition, Merge, Filter List, Document Loader, Context
Builder, Context Search, Web Scraper, Note.
- **Why these:** VectorShift is the "AI OS for **private-market investors**" (founders ex-Blackstone),
  so I built the nodes a **PE analyst** actually needs — reading **CIMs**, diligence over data rooms,
  company research: **Document Loader** (load a CIM/financials PDF), **Context Builder + Context
  Search** (RAG over the CIM — index it, ask questions), **Web Scraper** (research a company/market),
  and logic nodes **Condition / Merge / Filter** to route, combine, and filter in a workflow, plus
  **Note** to annotate.
- They also **stress-test the abstraction** on different axes: multiple output handles (Condition),
  multiple inputs (Merge), varied field kinds (Context Builder), and the zero-handle edge case (Note)
  — all rendered by the same `BaseNode` with no changes.

---

## Part 2 — Styling

**Problem.** The starter had no meaningful styling; it needed an appealing, **unified** design across
canvas, toolbar, nodes, handles, edges, and buttons.

**What I did.** Built one design system driven by shared CSS-variable **tokens** (color, radius,
spacing) so every surface reads as one product:
- **Light warm-gradient canvas + frosted-glass node cards**, a single **maroon accent**, airy
  spacing, **Inter** font, a **bottom** node toolbar, and a slim glass header.
- **Color-coded handles** — inputs **blue**, outputs **maroon** — so connection points are obvious;
  per-category icon tints for scannability.
- Themed React Flow chrome: colored **MiniMap**, bright animated **maroon edges** with arrowheads,
  styled Controls.
- **Resizable nodes** whose content **scales with size** (a `ResizeObserver` sets a `--node-scale`
  and text uses `em` units), so a bigger box shows bigger text.

**Why.** "Unified" comes from *shared tokens*, not per-component styling; the glass/maroon look nods
to VectorShift's product; blue/maroon handles remove guesswork when wiring.

---

## Part 3 — Text Node Logic

Two tasks, both done:

1. **Auto-resize.** The text field is a `<textarea>` that grows to fit its content
   (`scrollHeight`, clamped min/max), so the node expands as you type.
2. **Variables → dynamic handles.** Typing a valid JS variable in `{{ }}` creates a matching input
   handle on the left, live. Implementation:
   - Extract with a **non-greedy regex**; **validate** each as a JS identifier
     (`/^[A-Za-z_$][A-Za-z0-9_$]*$/`) so `{{ 2bad }}` is ignored; **de-duplicate** with a `Set`.
   - Render one left `target` handle per variable, evenly spaced, labelled.
   - Call React Flow's **`useUpdateNodeInternals`** on every change so new handles are actually
     connectable (RF caches handle positions otherwise).
   - Prune edges when a variable is removed; persist the text to the store.

---

## Part 4 — Backend Integration

**Problem.** Wire the frontend to the FastAPI backend: on Submit, send the pipeline's nodes+edges to
`/pipelines/parse`; the backend returns `{ num_nodes, num_edges, is_dag }`; show the result to the
user.

**How I did it.**
- **Frontend:** `submit.js` POSTs `{ nodes, edges }` to `/pipelines/parse` (through a central
  `api.js`).
- **Backend:** `/pipelines/parse` returns `num_nodes = len(nodes)`, `num_edges = len(edges)`, and
  `is_dag` computed with **Kahn's algorithm** (topological sort — build in-degrees, repeatedly remove
  zero-in-degree nodes; acyclic iff all nodes are removed, so cycles and self-loops correctly return
  `false`). Added **CORS** (allow `localhost:3000`) so the browser call succeeds.
- **Result display:** instead of a raw `alert()`, a themed **floating result banner** (top-center)
  shows **Nodes / Edges / DAG (Yes/No)** in a readable, user-friendly way; the sent graph and the
  response are also `console.log`ged for verification.
- **Verified** with tests: backend `pytest` over multiple graphs (linear, diamond, disconnected,
  cycle, self-loop) and a frontend React Testing Library test for the submit flow.
