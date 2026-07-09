# Execution

A concise account of what each part required, what I built, the methods I chose (and why), and the
extra features I added beyond the brief.

---

## What I delivered, part by part

### Part 1 — Node Abstraction
**Required:** a reusable abstraction + ≥ 5 new nodes.
**What I did:** I replaced the copy-paste-per-node approach with a single, config-driven `BaseNode`.
A node is now just a data object (`{ title, category, icon, handles, fields }`); `BaseNode` renders
the shell, fields, and handles from it. I refactored the 4 original nodes onto it and added 8 new
ones — so a new node costs a few lines of data and **zero** changes to `BaseNode`. (Full detail in
`NODES.md`.)

### Part 2 — Styling
**Required:** an appealing, unified design.
**What I did:** I applied one design system across the whole app — a light, warm-gradient canvas with
frosted-glass cards, a maroon accent, an airy layout, and a bottom node toolbar. Everything (header,
nodes, handles, edges, buttons, minimap) shares the same tokens (color, radius, spacing, font).

### Part 3 — Text Node Logic
**Required:** auto-resize + `{{ variable }}` → input handle.
**What I did:** the Text node's textarea grows with its content, and I parse `{{ ... }}` with a
non-greedy regex, keep only valid JS identifiers, de-duplicate them, and render one left handle per
variable. I call React Flow's `useUpdateNodeInternals` so new handles are immediately connectable,
and prune edges whose handle disappears.

### Part 4 — Backend Integration
**Required:** POST nodes/edges → `{num_nodes, num_edges, is_dag}` → show the result.
**What I did:** `submit.js` POSTs the graph to `/pipelines/parse`; the FastAPI endpoint returns the
three values, computing `is_dag` with **Kahn's algorithm** (topological sort — cycles and self-loops
correctly return `false`). I added CORS so the browser call succeeds, and the result appears in a
floating banner over the canvas.

---

## The abstraction method I chose (and why)

I evaluated the common React component-API patterns against three criteria I set: **reusability**
(adding a node shouldn't touch the base), **ease of use**, and **low learning curve**.

| Pattern | Verdict |
|---|---|
| **Props-configuration (data-driven)** | **Chosen** — highest on all three; a node is plain data |
| Compound components | Flexible but more verbose; over-engineered here |
| Higher-Order Components | Dated, opaque prop origin |
| Render props | Verbose, hurts uniformity |
| Custom hooks (headless) | Good, but needs markup per node anyway |

I chose **props-configuration** and added a small **`renderBody` escape hatch** for the one node that
needs custom behavior (the Text node's dynamic handles). That gives config's simplicity for the 95%
case and full freedom for the exception — the abstraction's only weakness, removed. This choice
directly matches the brief's goal: "speed up creating new nodes and applying styles across nodes."

---

## Extra features I added (beyond the brief)

- **Undo / Redo** — `Ctrl/Cmd+Z` and `Ctrl/Cmd+Y` (plus header buttons), backed by a history stack in
  the store; snapshots taken before each structural change; ignored while typing in a field.
- **Delete connections** — select an edge + `Delete`/`Backspace`, or click a ✕ that appears on hover.
- **Brighter, clearer wires** — bold edges with filled arrowheads that thicken and glow on hover/select.
- **Resizable nodes** — every node can be drag-resized, and its content (text/fields) **scales** with
  the box, so a bigger box shows bigger text.
- **Clear connection points** — inputs are blue, outputs are maroon, with a large grab area and a glow
  on hover; handle labels sit outside the node so they never overlap content.
- **In-app node documentation** — a "Node Guide" panel plus hover tooltips describing every node.
- **Colored, navigable minimap** and a live result banner showing the node/edge counts and DAG status.

---

## Methods & verification

- **State:** a single Zustand store holds `nodes`, `edges`, and the undo/redo history; node field
  values sync into the store so Submit always sends complete data.
- **Data-driven UI:** the toolbar, the `nodeTypes` map, and the in-app guide are all generated from one
  `definitions.js` list — add a node there and it appears everywhere automatically.
- **Tests:** a backend `pytest` suite covers the counts, response shape/types, and DAG detection
  (linear, diamond, disconnected, cycles, self-loop); a frontend React Testing Library suite covers the
  submit flow and the store's undo/redo. Both pass, and the production build compiles cleanly.
