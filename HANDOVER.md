# HANDOVER

Living log of what's built, how to run it, and how to test it. Updated after each part.

- **Docs map:** `README.md` (brief + decisions) · `EXECUTION.md` (detailed build spec) · this file (progress + how to run/test).
- **Stack:** React 18 + React Flow 11 + Zustand (frontend) · FastAPI (backend).

## Progress

| Part | Status |
|------|--------|
| Part 1 — Node abstraction + 4 refactors + 7 new nodes | ✅ Done |
| Part 3 — Text node logic (resize + `{{ }}` handles) | ✅ Done |
| Part 4 — Backend DAG + submit + glass modal | ✅ Done |
| Part 2 — Styling (light glass / maroon) | ✅ Done |

**All four parts complete.**

> ⚠️ Stale servers: earlier sessions left processes on ports **3000** and **8000**. If the app or
> backend seems to run "old" code, stop those first (`netstat -ano | findstr :3000` → `taskkill /PID <pid> /F`).

---

## How to run

### Frontend
```bash
cd frontend
npm install        # first time only (installs react-flow, zustand, lucide-react)
npm start          # → http://localhost:3000
```

### Backend
```bash
cd backend
pip install -r requirements.txt      # (requirements.txt added in Part 4; until then: pip install fastapi uvicorn)
uvicorn main:app --reload            # → http://localhost:8000
```

> Note: `zustand` and `lucide-react` are now real dependencies (added in Part 1). A fresh
> `npm install` picks them up automatically.

---

## Part 1 — Node Abstraction ✅

### What was built
A **data-driven node abstraction**. A node is now just a config object; one `BaseNode`
component renders every node type from that config. Adding a node requires **zero changes**
to `BaseNode`.

**New/changed files (all under `frontend/src/`):**
- `nodes/BaseNode.js` — the reusable shell: renders title (icon + category), body (fields or a
  custom `renderBody`), and handles (auto-spaced, with optional labels). Syncs field values to
  the Zustand store via `updateNodeField`.
- `nodes/NodeField.js` — renders one field by `kind`: `text | textarea | select | number | slider | checkbox`.
- `nodes/definitions.js` — the whole node catalog as data (4 originals + 7 new).
- `nodes/index.js` — builds React Flow's `nodeTypes` map from the definitions.
- `nodes/textNode.js` — custom Text body via the `renderBody` escape hatch (basic for now; Part 3 adds logic).
- `toolbar.js` — palette chips generated from the definitions (new nodes appear automatically).
- `draggableNode.js` — chip now supports a lucide icon.
- `ui.js` — imports `nodeTypes` from `./nodes`; removed 4 hardcoded imports; fixed a `100wv`→`100%` typo.
- Deleted `nodes/inputNode.js`, `outputNode.js`, `llmNode.js` (replaced by the abstraction).

### The config contract (how a new node is declared)
```js
{
  type: 'condition',            // matches nodeTypes key + toolbar chip
  title: 'Condition',
  category: 'logic',            // drives icon color / title tint (Part 2)
  icon: 'GitBranch',            // any lucide-react icon name
  handles: [
    { id: 'input', type: 'target', side: 'left' },
    { id: 'true',  type: 'source', side: 'right', label: 'True' },
    { id: 'false', type: 'source', side: 'right', label: 'False' },
  ],
  fields: [
    { name: 'condition', label: 'Condition', kind: 'text', placeholder: 'e.g. score > 0.5' },
  ],
  // optional escape hatch for custom bodies:
  // renderBody: ({ id, data, values, setField }) => <Custom .../>,
}
```
Field `kind`s supported: `text | textarea | select | number | slider | checkbox`.
`default` may be a function of the node id (used to auto-name Input/Output nodes).

### The 11 node types now available
- **Originals (refactored):** Input, Output, LLM, Text
- **New:** Condition (2 outputs), Merge (2 inputs), Filter List, Semantic Search (select+number+slider),
  File Loader (checkbox), Web Scraper, Note (0 handles)

### How to test Part 1
1. `cd frontend && npm start`, open http://localhost:3000.
2. **Drag each of the 11 chips** from the toolbar onto the canvas — every one should render with its
   title, icon, fields, and handles.
3. **Connect nodes:** drag from a right-side (source) handle to a left-side (target) handle — a wire forms.
4. **Field types:** on **Semantic Search** confirm the dropdown, number, and slider all work; on
   **File Loader** the OCR checkbox toggles; on **Note** there are no handles (edge case).
5. **Branching:** the **Condition** node shows two labelled output handles (True/False); **Merge** shows
   two labelled inputs.
6. **Abstraction proof:** open `nodes/definitions.js` — every node is a config entry, and none of the 7
   new nodes required editing `BaseNode.js`.

> Styling is intentionally minimal here (default look). The polished light-glass/maroon theme lands in Part 2.

### Verification done
- `npm run build` compiles cleanly (one pre-existing `useCallback` deps warning in `ui.js`, unrelated).

---

---

## Part 3 — Text Node Logic ✅

### What was built
The Text node body (`nodes/textNode.js`, rendered via BaseNode's `renderBody`) now:
1. **Auto-resizes** — the `<textarea>` grows with content (`scrollHeight`, clamped 48–240px).
2. **Dynamic variable handles** — typing a valid JS identifier inside `{{ }}` adds a matching
   **input handle** on the left edge, live. Multiple variables → multiple evenly-spaced handles.

**Correctness details (the tricky bits, handled):**
- **Extraction:** non-greedy global regex `/\{\{([^}]*)\}\}/g`; each `{{ }}` captured separately; inner text trimmed.
- **Validation:** only valid JS identifiers (`/^[A-Za-z_$][A-Za-z0-9_$]*$/`) become handles; invalid ones ignored.
- **De-dupe:** `Set` → one handle per unique name.
- **Re-measure:** `useUpdateNodeInternals(id)` runs whenever the variable set changes, so new handles are
  actually connectable (React Flow caches handle positions otherwise — the classic gotcha).
- **No dangling edges:** removing a variable prunes any edge wired to its now-gone handle
  (`store.removeEdgesToMissingHandles`).
- **State:** text persists to the store via `setField`/`updateNodeField`, so Part 4 submit will include it.

**Changed files:** `nodes/textNode.js` (logic), `store.js` (added `removeEdgesToMissingHandles`).

### How to test Part 3
1. `cd frontend && npm start`, open http://localhost:3000; drag a **Text** node onto the canvas.
2. **Auto-resize:** type/paste several lines — the node grows taller to fit.
3. **Variables → handles:** type `Hi {{ customer }}, ticket {{ ticket_id }} is {{ status }}` →
   **3 input handles** appear on the left, evenly spaced, each labelled.
4. **Validation:** type `{{ 2fast }}`, `{{ my var }}`, `{{ user-name }}` → **no** handles created.
5. **De-dupe:** type `{{ user }} {{ user }}` → only **one** `user` handle.
6. **Connect + remove:** wire another node's output into a variable handle, then delete that
   `{{ variable }}` from the text → the handle **and** the wire disappear cleanly.

### Verification done
- `npm run build` compiles cleanly.
- Parsing/validation/dedupe logic unit-tested against 6 cases (including non-greedy, dedupe,
  and all-invalid inputs) — **6/6 passed**.

---

---

## Part 4 — Backend Integration ✅

### What was built
End-to-end submit: the frontend POSTs the pipeline to FastAPI, which analyzes it and returns
counts + DAG status, shown in a themed modal.

**Backend (`backend/main.py`):**
- Added `CORSMiddleware` (allows `http://localhost:3000`) — required or the browser blocks the call.
- Pydantic models `Node`/`Edge`/`Pipeline` (extra React Flow fields are ignored).
- `/pipelines/parse` is now **POST**; returns `{ num_nodes, num_edges, is_dag }`.
- `is_dag()` uses **Kahn's algorithm** (topological sort): build in-degrees, peel off zero-in-degree
  nodes; acyclic iff all nodes get visited. Self-loops and cycles correctly return `false`; edges to
  unknown nodes are ignored.
- Added `backend/requirements.txt` (`fastapi`, `uvicorn`).

**Frontend:**
- `submit.js` — reads `nodes`/`edges` from the store, POSTs JSON to `http://localhost:8000/pipelines/parse`,
  handles loading + errors, opens the modal on response.
- `ResultModal.js` — themed modal showing Nodes / Edges / Is-DAG and a friendly message (or an error
  with a hint to start the backend). Replaces `window.alert()`.

### How to test Part 4
1. Start backend: `cd backend && pip install -r requirements.txt && uvicorn main:app --reload` (port 8000).
   - ⚠️ If port 8000 is already in use by a stale server, stop it first (otherwise it shadows this one).
2. Start frontend: `cd frontend && npm start`.
3. Build a small pipeline (e.g. Input → LLM → Output, wired left→right), click **Submit Pipeline** →
   a modal shows the node count, edge count, and “Valid pipeline” (is_dag = Yes).
4. Create a **cycle** (wire a downstream node's output back into an upstream input) → Submit → modal
   shows “Pipeline has a cycle” (is_dag = No).
5. Stop the backend and Submit → a friendly error modal appears (proves error handling).

### Verification done
- Endpoint tested via FastAPI `TestClient` on 6 graphs (linear, cycle, self-loop, diamond, empty,
  disconnected) — **6/6 correct**.
- Live `uvicorn` server smoke test: linear → `is_dag:true`, cycle → `is_dag:false`, CORS preflight → `200`.
- `npm run build` compiles cleanly.

---

## Part 2 — Styling ✅

### What was built
A unified **light-glass / warm-maroon** design system applied across the whole app.

- **`index.css`** — the full system: CSS-variable tokens (accent maroon scale, warm gradient, glass
  recipe, per-category colors), plus styles for every surface. Inter font loaded via Google Fonts.
- **`App.js`** — restructured into a 3-row layout: slim glass **header** (VectorShift wordmark +
  Submit button) · flex-fill **canvas stage** · **bottom toolbar** (the node palette).
- **Nodes** — frosted-glass cards, category-tinted icon + left accent bar, airy padding, styled fields
  (text/select/number/slider/checkbox) with maroon focus rings.
- **Handles** — round; source (right) = maroon, target (left) = warm slate; hover glow. Text-node
  variable handles get small muted labels.
- **Edges/wires** — maroon, brighter on hover/select.
- **Submit button + result modal** — maroon gradient button; glass modal with big stat tiles
  (Nodes / Edges / Is-DAG) and smooth fade/pop animation.
- **React Flow chrome** — Controls / MiniMap themed to match; attribution hidden; canvas transparent
  so the warm gradient shows through a glass-framed stage.
- Interactive inputs marked `nodrag` so typing/sliding doesn't drag the node.

**Readability guardrail honored:** cards use high-opacity white glass + near-charcoal text; maroon is
an accent only (buttons, wires, focus, active) — never behind body text.

### Layout note
`ui.js` sets the canvas wrapper to `70vh` inline; `index.css` overrides it to fill the flex stage
(`.vs-stage > div { height:100% !important }`) so the canvas is fully responsive without editing `ui.js`.

### How to test Part 2
1. Run frontend + backend (see "How to run"). Open http://localhost:3000.
2. Confirm: warm light-glass look, header wordmark + maroon **Submit Pipeline** button, node palette
   along the **bottom**.
3. Drop nodes — glass cards with category-colored icons/left bars; drag wires — maroon animated edges.
4. Focus a field — maroon focus ring; hover a handle — maroon glow; hover a chip — it lifts.
5. Click Submit — a glass modal with stat tiles animates in.

### Verification done
- `npm run build` compiles cleanly; dev server compiles and serves **HTTP 200**.
- Note: no browser/screenshot tool was available in the build environment, so the *visual* result
  wasn't screenshot-verified here — it's built to the `EXECUTION.md` §2 token spec. Please eyeball it
  once in your browser.

---

---

## Automated tests

**Backend** (`backend/test_main.py`, 13 tests — covers N7–N10):
```bash
cd backend && python -m pytest -v
```
Covers node/edge counts, DAG detection (linear, diamond, disconnected, empty, 2-/3-node cycles,
self-loop, cycle hidden in a larger graph), exact response keys, and int/int/bool types.

**Frontend** (`src/submit.test.js` + `src/ResultModal.test.js`, 5 tests — covers N6 + N11):
```bash
cd frontend && npm test         # (CI=true npx react-scripts test --watchAll=false)
```
Covers: clicking Submit POSTs `{nodes, edges}` to `/pipelines/parse`; the modal triggers on the
response and shows num_nodes / num_edges / is_dag; the cycle message renders; and an error modal
shows when the backend is unreachable.

Latest run: **backend 13/13 passed · frontend 5/5 passed**.
(A harmless "worker process failed to exit gracefully" line may appear after the frontend run — it's
a Jest teardown warning, not a test failure.)

---

## Project is feature-complete
All four assessment parts are implemented, committed, and pushed. Suggested final step before
submitting: run both servers, click through the test steps in each part above, and skim the diff.
