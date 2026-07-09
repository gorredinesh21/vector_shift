# HANDOVER

Living log of what's built, how to run it, and how to test it. Updated after each part.

- **Docs map:** `README.md` (brief + decisions) · `EXECUTION.md` (detailed build spec) · this file (progress + how to run/test).
- **Stack:** React 18 + React Flow 11 + Zustand (frontend) · FastAPI (backend).

## Progress

| Part | Status |
|------|--------|
| Part 1 — Node abstraction + 4 refactors + 7 new nodes | ✅ Done |
| Part 3 — Text node logic (resize + `{{ }}` handles) | ⏳ Pending |
| Part 4 — Backend DAG + submit + glass modal | ⏳ Pending |
| Part 2 — Styling (light glass / maroon) | ⏳ Pending |

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

## Next up
**Part 3** — enhance `nodes/textNode.js`: auto-resize + dynamic `{{ variable }}` → left-side handles
(with `useUpdateNodeInternals`), then Part 4 (backend) and Part 2 (styling).
