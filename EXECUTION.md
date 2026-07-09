# VectorShift Assessment — Execution Plan

This is the authoritative build spec. It records **every decision made** (with the reasoning),
the **concrete design tokens**, and the **step-by-step execution** for each part. If a detail
is ambiguous during the build, this file is the source of truth.

> Companion docs: `README.md` (the brief + locked-decisions summary), and the assessment PDF
> (the original requirements — it wins on any conflict of *requirements*, this file wins on
> *how we implement them*).

---

## 0. Ground Rules & Ownership

**Split of labor (agreed):**
- **User owns creative/taste decisions** — architecture choice, node selection, visual direction,
  palette, layout. (All now decided — see below.)
- **Implementation owns correctness/execution** — Part 3 logic, Part 4 backend + DAG, CORS,
  and writing all code/CSS to the chosen spec.

**Stack (do not change):** JavaScript + React 18, `reactflow` 11.8.3, Zustand (frontend);
Python + FastAPI, Uvicorn (backend).

**Build order:** **Part 1 → Part 3 → Part 4 → Part 2.**
Rationale: build the abstraction first so the Text node lands directly in its final home
(the `renderBody` escape hatch) instead of being written twice; style last so we polish a
stable structure rather than a moving target.

---

## 1. Locked Decisions (the "why" in one place)

### 1.1 Part 1 — Node abstraction architecture
- **Chosen:** props-configuration / data-driven `BaseNode`. A node = a config object
  `{ title, category, icon, handles[], fields[] }`. `BaseNode` renders the shell (card, title,
  handles, fields) from that config.
- **Escape hatch:** config may provide `renderBody({ id, data, values, setField })` for nodes
  whose body is too custom for plain fields (used by the Text node in Part 3).
- **Why:** scored highest on the user's three criteria — reusability (add a node = new config,
  never edit `BaseNode`), ease of use, and lowest learning curve. Escape hatch removes its only
  weakness (the oddball node). Beats compound-components (over-engineered here) and HOCs (dated,
  opaque prop origin).

### 1.2 Part 1 — The 7 new nodes (chosen to stress-test the abstraction on different axes)
| # | Node | Category | Handles | Fields | Proves |
|---|------|----------|---------|--------|--------|
| 1 | **Condition (If/Else)** | Logic | 1 target → 2 sources (`true`,`false`) | text (condition) | multiple **output** handles / branching |
| 2 | **Merge** | Logic | 2+ targets → 1 source | dropdown (Pick First / Join All) | multiple **input** handles |
| 3 | **Filter List** | List Ops | 1 target → 1 source | text (predicate) + dropdown (keep/drop) | list-type node |
| 4 | **Semantic Search** | Knowledge | 1 target (query) → 1 source (results) | dropdown (KB) + number (top-K) + slider (threshold) | many + **varied** field kinds |
| 5 | **File Loader** | Data Loader | 1 target → 1 source | dropdown (file type) + checkbox (OCR) | file flow + **checkbox** field |
| 6 | **Web Scraper** | Data Loader | 1 target (URL) → 1 source | text (URL) + number (depth) | realistic loader |
| 7 | **Note / Sticky** | Utility | **0 handles** | textarea only | the **empty / no-handle** edge case |

Plus the 4 originals refactored onto the abstraction: **Input, Output, LLM, Text**.

### 1.3 Part 2 — Visual design (light glass / warm red-maroon)
- **Direction:** modern **glass** on a **light** base (not dark).
- **Canvas:** soft warm gradient (blush/rosé) — light and bright.
- **Cards:** frosted glass — translucent white + `backdrop-filter: blur`, hairline border, soft shadow.
- **Accent:** **red / maroon** — used as a true *accent* (submit button, active/selected states,
  edges/wires, handle-hover glow), NOT everywhere. Body text stays charcoal.
- **Density:** **airy** (generous padding/gaps).
- **Layout:** **bottom toolbar** — the draggable node palette runs along the bottom of the screen.
- **Minor defaults (taken):** `lucide-react` icons per node; subtle per-category title tint;
  **Inter** font; small label beside each dynamic `{{ }}` handle; slim glass header with a
  "VectorShift" wordmark.
- **Guardrail:** keep contrast high — near-charcoal text on light glass; maroon used sparingly so
  it reads elegant, not heavy.

### 1.4 Part 3 — Text node logic (correctness-driven, implementation-owned)
1. **Extraction:** non-greedy global regex; find each `{{ ... }}` separately; `.trim()` inside.
2. **Validation:** keep only legal JS identifiers — `/^[A-Za-z_$][A-Za-z0-9_$]*$/`. Invalid → no handle.
   (Reserved-word rejection intentionally skipped as overkill.)
3. **De-dupe:** `Set` → one handle per unique name.
4. **Re-measure:** `useUpdateNodeInternals()` on every variable-set change (make-or-break).
5. **Stable handle ids** `${nodeId}-${varName}`; prune edges pointing at removed handles.
6. **Spacing:** handle *i* of *n* at `top: (i+1)/(n+1)*100%`.
7. **Auto-resize:** `<textarea>`; grow height to `scrollHeight` with sensible min/max; modest capped width growth.
8. **State ownership:** write text back to the store via `updateNodeField` so Part 4 submit sees it.

### 1.5 Part 4 — Backend integration
- **Submit:** POST `{ nodes, edges }` (JSON) to `/pipelines/parse`.
- **Backend:** compute `num_nodes`, `num_edges`, and `is_dag` (cycle check via Kahn's algorithm /
  topological sort). Response: `{ num_nodes: int, num_edges: int, is_dag: bool }`.
- **Result display:** a **styled glass modal/toast** matching the theme (NOT a native `alert()`).

---

## 2. Design Tokens (concrete values — used everywhere in Part 2)

> Exact hex values may be nudged slightly during implementation for contrast, but this is the target.

**Color**
```
--accent-maroon      #8C2F39   /* primary accent: buttons, wires, active   */
--accent-red         #B83248   /* brighter red: hover/highlight             */
--accent-soft        #E9536A   /* light red for subtle highlights/glows     */
--canvas-grad-1      #FDF7F5   /* top-left of canvas gradient (warm white)  */
--canvas-grad-2      #F7EBEE   /* mid (soft blush)                          */
--canvas-grad-3      #F3E6EC   /* bottom-right (rosé)                       */
--glass-bg           rgba(255,255,255,0.62)     /* frosted card fill        */
--glass-border       rgba(140,47,57,0.14)       /* hairline maroon-tinted   */
--glass-shadow       0 8px 30px rgba(80,20,35,0.10)
--text-strong        #2A2328   /* near-charcoal, primary text              */
--text-muted         #6E5C63   /* labels, secondary                        */
--handle-source      #B83248   /* output handles (maroon/red)              */
--handle-target      #9A8C90   /* input handles (warm slate)               */
--field-bg           rgba(255,255,255,0.7)
--field-border       rgba(42,35,40,0.14)
```

**Category tints (subtle title-bar wash)**
```
Logic        soft amber      General/IO   soft slate
Knowledge    soft teal       Data Loader  soft indigo
List Ops     soft green      LLM/AI       soft violet
Utility      soft rose
```
(All low-opacity so they harmonize with the maroon accent, not fight it.)

**Typography** — Inter (via Google Fonts or `@fontsource`), fallback `system-ui`.
```
title   14px / 600     label  12px / 500 (muted)     value  13px / 400
header  18px / 700 (wordmark)
```

**Spacing / shape (airy)**
```
base unit 4px;  node padding 16px;  field gap 12px;  card radius 14px;
input radius 10px;  toolbar chip radius 10px;  handle size 11px (round)
```

**Glass recipe (reused)**
```css
background: var(--glass-bg);
backdrop-filter: blur(14px) saturate(160%);
-webkit-backdrop-filter: blur(14px) saturate(160%);
border: 1px solid var(--glass-border);
box-shadow: var(--glass-shadow);
border-radius: 14px;
```

---

## 3. Part 1 — Node Abstraction (execution steps)

**Target files (new unless noted):**
```
frontend/src/nodes/BaseNode.js          # the shell renderer (config → UI)
frontend/src/nodes/NodeField.js         # renders one field by "kind"
frontend/src/nodes/fields/…             # (optional) per-kind field components
frontend/src/nodes/definitions.js       # config objects for all nodes
frontend/src/nodes/index.js             # builds nodeTypes map from definitions
frontend/src/nodes/textNode.js          # rewritten as a renderBody custom node (Part 3)
frontend/src/toolbar.js                 # (edit) generate chips from definitions
frontend/src/ui.js                      # (edit) import nodeTypes from nodes/index
```

**Config object shape (the contract):**
```js
{
  type: 'condition',            // matches nodeTypes key + toolbar
  title: 'Condition',
  category: 'logic',            // drives icon + title tint
  icon: 'GitBranch',            // lucide icon name
  handles: [
    { id: 'input',  type: 'target', side: 'left'  },
    { id: 'true',   type: 'source', side: 'right', label: 'True'  },
    { id: 'false',  type: 'source', side: 'right', label: 'False' },
  ],
  fields: [
    { name: 'condition', label: 'Condition', kind: 'text', default: '' },
    // kinds: 'text' | 'textarea' | 'select' | 'number' | 'slider' | 'checkbox'
  ],
  // optional escape hatch:
  // renderBody: ({ id, data, values, setField }) => <CustomBody .../>
}
```

**Steps:**
1. **`NodeField.js`** — a `switch (field.kind)` rendering `text | textarea | select | number | slider | checkbox`. Each is a controlled input calling `onChange(value)`.
2. **`BaseNode.js`** —
   - accept `{ id, data, config }`;
   - init a `values` state from `data`/field defaults;
   - `setField(name, val)` updates local state **and** calls store `updateNodeField(id, name, val)`;
   - render: glass card → title row (icon + title, category tint) → body
     (`config.renderBody?.(...)` if present, else map `fields` → `NodeField`);
   - map `config.handles` → `<Handle>` with computed even spacing per side; render optional handle `label`.
3. **`definitions.js`** — write config for the 4 originals + 7 new nodes (§1.2). Text node uses `renderBody`.
4. **`index.js`** — `nodeTypes` = map each def via `makeNode(cfg) = (props) => <BaseNode {...props} config={cfg} />`.
5. **`ui.js`** — import `nodeTypes` from `nodes/index` (remove the four hardcoded imports).
6. **`toolbar.js`** — generate `<DraggableNode>` chips by iterating definitions (label + icon), grouped by category. (Toolbar moves to the bottom in Part 2.)
7. **Sanity check:** drag each of the 11 node types onto the canvas; every one renders and connects. No `BaseNode` edits were needed to add the 7 — that's the deliverable's proof.

---

## 4. Part 3 — Text Node Logic (execution steps)

**File:** `frontend/src/nodes/textNode.js` (a custom body, referenced by the Text config's `renderBody`).

**Steps:**
1. **Textarea + auto-resize:** replace `<input>` with `<textarea>`; on change, set height from
   `scrollHeight` (min ~64px, max ~260px then scroll); grow width modestly with longest line (cap ~360px).
2. **Parse variables:** `const found = [...text.matchAll(/\{\{([^}]*)\}\}/g)].map(m => m[1].trim())`.
3. **Validate + dedupe:** `const vars = [...new Set(found.filter(v => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(v)))]`.
4. **Render handles:** one `type="target"` handle per var on the left, id `${id}-${v}`, spaced by
   `top: (i+1)/(vars.length+1)*100%`, with a small maroon-muted label showing the var name.
5. **Re-measure:** `const updateNodeInternals = useUpdateNodeInternals();`
   `useEffect(() => updateNodeInternals(id), [vars.join(','), id, updateNodeInternals]);`
6. **Prune dangling edges:** when `vars` shrinks, remove store edges whose `targetHandle` is no longer in
   the current handle-id set (add a small store action or filter in the effect).
7. **Persist text:** `updateNodeField(id, 'text', value)` on change so Part 4 submit includes it.
8. **Verify:** type `Hi {{ customer }} re {{ ticket_id }}` → 2 handles appear, spaced, connectable;
   type `{{ 2bad }}`/`{{ a b }}` → no handle; delete a var → its handle + any wire disappear; box grows.

---

## 5. Part 4 — Backend Integration (execution steps)

**Frontend — `frontend/src/submit.js`:**
1. Read `nodes` + `edges` from the store (`useStore`).
2. On click, `POST` to `http://localhost:8000/pipelines/parse` with
   `headers: {'Content-Type':'application/json'}`, `body: JSON.stringify({ nodes, edges })`.
3. On success, open the **glass result modal** (new component) showing num_nodes, num_edges, is_dag
   in friendly language (e.g. "✅ 5 nodes, 4 connections — valid pipeline (DAG)"). Handle fetch errors
   with a themed error toast.

**Backend — `backend/main.py`:**
1. Add `CORSMiddleware` allowing `http://localhost:3000` (methods/headers `*`). **Required** or the
   browser blocks the request.
2. Define Pydantic models for the incoming `{ nodes, edges }`.
3. Change `/pipelines/parse` to **POST**; compute:
   - `num_nodes = len(nodes)`, `num_edges = len(edges)`;
   - `is_dag` via **Kahn's algorithm** (build adjacency from edges' source→target, repeatedly remove
     zero-in-degree nodes; DAG iff all nodes removed). Chosen for clarity + it naturally handles
     disconnected graphs and gives is_dag directly.
4. Return `{ "num_nodes": ..., "num_edges": ..., "is_dag": ... }`.
5. Add a `backend/requirements.txt` (`fastapi`, `uvicorn`).

**Verify:** build a linear pipeline → submit → modal shows correct counts + `is_dag: true`;
create a cycle (wire output back to an input) → `is_dag: false`.

---

## 6. Part 2 — Styling (execution steps, applied last)

Apply the §2 tokens across every surface:
1. **Global:** load Inter; define CSS variables on `:root`; set the light warm gradient on the app/canvas.
2. **Header:** slim glass bar, "VectorShift" wordmark (maroon), maybe a subtle logo mark.
3. **Bottom toolbar:** glass bar pinned to the bottom; node chips with lucide icons, grouped by
   category, hover lift; drag cursor states.
4. **Nodes (`BaseNode` styles):** glass card, category-tinted title with icon, airy padding, styled
   fields (text/select/number/slider/checkbox), maroon focus rings.
5. **Handles:** round 11px; source = maroon, target = warm slate; hover glow (accent-soft);
   variable-handle labels styled small/muted.
6. **Edges/wires:** recolor React Flow edges to maroon; keep the animated arrow; selected = brighter red.
7. **React Flow chrome:** theme `Controls` + `MiniMap` + `Background` to match (light, subtle).
8. **Submit button + modal/toast:** maroon primary button; glass modal with the result, backdrop blur,
   airy layout, one accent action.
9. **Responsiveness/contrast pass:** verify text contrast on glass; ensure the bottom toolbar doesn't
   cover nodes (canvas height accounts for header + toolbar).

---

## 7. Cross-Cutting Gotchas (must handle)

- **`zustand` not in `package.json`** — `store.js` imports it directly. Run `npm install zustand`
  in `frontend/` if `npm start` can't resolve it. (Also add `lucide-react`.)
- **CORS** — `:3000 → :8000` is cross-origin; without `CORSMiddleware` the submit fails silently in the browser.
- **`updateNodeInternals`** — dynamic handles won't connect until React Flow re-measures (Part 3, step 5).
- **`ui.js` typo** — `width: '100wv'` should be `100vw`/`100%`; fix during Part 2.
- **State in store vs local** — fields must persist to the store (via `updateNodeField`) so Part 4 submit
  sends complete data.

---

## 8. Final Verification Checklist

- [ ] Adding the 7 new nodes required **zero** edits to `BaseNode` (abstraction proof).
- [ ] All 11 node types drag, drop, render, and connect.
- [ ] Text node: auto-resizes; `{{ valid }}` → handle; invalid → none; dedupe works; handles connect;
      deleting a var removes its handle + wire.
- [ ] Submit POSTs; backend returns correct `{num_nodes, num_edges, is_dag}`; cycle → `is_dag:false`.
- [ ] Result shown in a themed glass modal/toast (no native alert).
- [ ] Unified light-glass / maroon look across header, bottom toolbar, nodes, handles, edges, button, modal.
- [ ] Runs clean: `npm start` (frontend) + `uvicorn main:app --reload` (backend), no console errors on a normal flow.
- [ ] Short "abstraction & decisions" note present (this file + README cover it).
