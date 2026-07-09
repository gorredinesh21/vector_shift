# VectorShift — Frontend Technical Assessment

A take-home assessment for VectorShift. The goal is to turn a bare-bones React Flow +
FastAPI starter into a polished, extensible **visual pipeline builder** — nodes you can
drag onto a canvas, wire together, style, and submit to a backend for analysis.

This README is the working brief: it explains **what to build**, **what to hand in**,
**where original judgment matters vs. where AI assistance is fine**, and **how to submit**.

> Source of truth: `VectorShift - Frontend Technical Assessment Instructions.pdf` (in this
> repo). If anything here disagrees with the PDF, the PDF wins.

---

## 🧰 Tech Stack

| Layer     | Tech                                                                 |
| --------- | ------------------------------------------------------------------- |
| Frontend  | JavaScript + **React 18**, **React Flow** (`reactflow` 11.8.3), **Zustand** (state) |
| Backend   | Python + **FastAPI** (served with **Uvicorn**)                      |

You may add, delete, or modify any file, and install any packages you like — as long as
the frontend stays JavaScript/React and the backend stays Python/FastAPI.

---

## 📂 Starting Point (what's already here)

```
vector_shift/
├── frontend/
│   └── src/
│       ├── App.js            # Root component
│       ├── ui.js             # React Flow canvas + node-type registry
│       ├── toolbar.js        # Draggable node palette (Input / LLM / Output / Text)
│       ├── draggableNode.js  # A single draggable palette item
│       ├── store.js          # Zustand store: nodes, edges, onConnect, addNode, etc.
│       ├── submit.js         # ⚠️ Currently just a bare <button> — not wired up
│       ├── index.css
│       └── nodes/
│           ├── inputNode.js  # ⚠️ Four nodes with heavily duplicated markup/styles
│           ├── outputNode.js
│           ├── llmNode.js
│           └── textNode.js
└── backend/
    └── main.py               # ⚠️ /pipelines/parse is a stub returning {'status': 'parsed'}
```

The `⚠️` items are the things the assessment asks you to fix/build.

---

## 🎯 The Four Parts

Read all four before starting — they build on each other, and Part 1's abstraction should
make Parts 2–3 easier.

### Part 1 — Node Abstraction
The four existing nodes share a lot of copy-pasted structure (container, title, handles,
fields). Copy-paste-per-node does not scale.

**Build** a reusable abstraction (e.g. a `BaseNode` component and/or a config-driven node
factory) so a new node can be defined with minimal code — ideally just a small
declaration of its title, fields, and handles.

**Then** refactor the original four nodes (Input, Output, LLM, Text) onto it, **and create
5 brand-new nodes** to show it off. The nodes' actual purpose doesn't matter much — they
exist to demonstrate how little code a new node takes.

### Part 2 — Styling
The starter has essentially no styling. **Design a cohesive, appealing UI** for the canvas,
toolbar, nodes, handles, edges, and submit button. Any CSS approach/library is allowed
(Tailwind, CSS Modules, styled-components, plain CSS, a component kit, etc.). You may take
inspiration from VectorShift's real product or design something original.

### Part 3 — Text Node Logic
Enhance the **Text** node's input field:
1. **Auto-resize** — the node's width/height grows as the user types more text.
2. **Variable handles** — when the user types a valid JS variable inside double curly
   braces (e.g. `{{ input }}`), dynamically add a matching **input Handle** on the node's
   left edge. Multiple variables ⇒ multiple handles; edits update handles live.

### Part 4 — Backend Integration
Wire the frontend to the backend end-to-end:
1. **`submit.js`** — on click, POST the current `{ nodes, edges }` to `/pipelines/parse`.
2. **`backend/main.py`** — rewrite `/pipelines/parse` to accept the pipeline and return:
   ```json
   { "num_nodes": int, "num_edges": int, "is_dag": bool }
   ```
   (`is_dag` = does the graph have no cycles. Use a topological-sort / DFS cycle check.)
3. **Frontend feedback** — when the response arrives, show a **user-friendly alert/modal**
   with the node count, edge count, and whether it's a valid DAG.

---

## 🔒 Decisions Locked So Far

- **Part 1 architecture:** **props-configuration / data-driven** `BaseNode` (a node = a config
  object of `{ title, handles, fields }`) **+ a `renderBody` escape hatch** for nodes that need
  custom behavior (e.g. the Text node). Chosen for best reusability + ease + low learning curve.
- **Part 3 technical decisions (owned by implementation — correctness-driven, not creative):**
  1. **Extraction:** non-greedy global regex to find every `{{ ... }}` separately, then `.trim()` the inside.
  2. **Validation:** keep a variable only if it's a legal JS identifier — `/^[A-Za-z_$][A-Za-z0-9_$]*$/`
     (start with letter/`_`/`$`, then alphanumerics/`_`/`$`). Invalid names create no handle. (Reserved-word
     rejection intentionally skipped as overkill.)
  3. **De-duplicate** variables via a `Set` — one handle per unique name.
  4. **Re-measure handles:** call React Flow's `useUpdateNodeInternals()` whenever the variable set changes
     (the make-or-break step so new handles are actually connectable).
  5. **Stable handle ids** (`${nodeId}-${varName}`); when a variable is removed, prune any edges referencing
     its now-gone handle so no wires dangle.
  6. **Even spacing:** handle *i* of *n* sits at `top: (i+1)/(n+1) * 100%`.
  7. **Auto-resize:** swap `<input>` → `<textarea>`; grow height to fit content (`scrollHeight`) with sensible
     min/max bounds; modest width growth capped.
  8. **State ownership:** write text back to the Zustand store via `updateNodeField` so Part 4's submit sees it.
- **Part 2 design direction:** **Light gradient / glass, warm red-maroon accent.**
  - Base: **light**, soft warm gradient canvas (blush/rosé tones) — not dark.
  - Cards: frosted-glass (translucent + `backdrop-filter: blur`) with hairline borders + soft shadow.
  - Accent: **red / maroon** for the submit button, active states, handles-on-hover, and edges/wires.
  - **Density: airy** (generous padding/spacing).
  - **Layout: bottom toolbar** — the draggable node palette sits along the bottom of the screen.
  - Guardrail: keep text near-charcoal on light glass so contrast stays high and readable.
  - Minor defaults (taken unless changed): `lucide-react` icons per node; subtle per-category title tint;
    **Inter** font; small label beside each `{{ }}` handle; slim glass header with a "VectorShift" wordmark.
- **Part 4 result display:** a **styled glass modal/toast** (matching the theme) — not a native `alert()`.
- **7 new nodes to build** (chosen to stress-test the abstraction on *different* axes):
  1. **Condition (If/Else)** — 1 input → 2 outputs *(tests multiple output handles / branching)*
  2. **Merge** — 2+ inputs → 1 output *(tests multiple input handles)*
  3. **Filter List** — list in/out + predicate *(tests list-type nodes)*
  4. **Semantic Search** — KB dropdown + top-K + threshold *(tests many/varied field kinds)*
  5. **File Loader** — file type dropdown + OCR checkbox *(tests file data flow + checkbox field)*
  6. **Web Scraper** — URL + depth *(realistic data-loader node)*
  7. **Note / Sticky** — textarea, **0 handles** *(tests the empty / no-handles edge case)*

## ✅ Deliverables Checklist

- [ ] **Part 1** — Node abstraction (decided ✔), 4 originals refactored onto it, + **7 new nodes** *(not started)*
- [ ] **Part 2** — A unified, polished visual design across the whole app *(not started)*
- [ ] **Part 3** — Text node auto-resizes **and** generates handles from `{{ variables }}` *(not started)*
- [ ] **Part 4** — Submit POSTs the pipeline; backend returns `{num_nodes, num_edges, is_dag}`; friendly alert *(not started)*
- [ ] App runs cleanly with the commands below (no console errors on a normal flow) *(not started)*
- [ ] A short note in this README (or a `NOTES.md`) explaining your abstraction & key decisions *(not started)*

---

## 🧠 Where to use *your* creativity vs. where AI (Claude Code) is fine

This is an interview signal, not just a coding task. Assume you may be asked to **explain
and defend any part of it live** — so use AI as an accelerator, never as a substitute for
understanding. A good rule: *if you couldn't whiteboard it in the follow-up, don't ship it.*

**Own it yourself — this is what's actually being judged:**
- **The abstraction's API design (Part 1).** How a new node is declared is the core signal.
  Decide the shape yourself; don't outsource the key architectural call.
- **The visual design (Part 2).** Taste, layout, color, spacing, and "does it feel premium"
  are personal and hard to fake — this is your chance to stand out.
- **Choosing the 5 new nodes.** Pick ones that stress-test the abstraction (varying fields,
  handle counts, dynamic behavior) rather than five near-identical clones.
- **Any tricky logic in Part 3/4** (variable parsing edge cases, the DAG algorithm choice) —
  understand the *why*, since these are prime interview follow-up territory.

**Fine to lean on Claude Code / AI for:**
- Scaffolding and mechanical **refactors** (moving the 4 nodes onto your abstraction once
  *you've* designed it).
- **Boilerplate**: fetch wiring in `submit.js`, FastAPI request models, CORS setup.
- Writing the **DAG check** once you've picked the approach, plus edge-case tests for it.
- CSS grunt work, responsive tweaks, and cross-browser fiddliness.
- Debugging, error messages, and this documentation.

**Bottom line:** let AI handle the typing; you handle the deciding.

---

## 🚀 Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v16+ and npm
- [Python](https://www.python.org/) 3.8+ with `pip` (a virtualenv is recommended)

### Frontend
```bash
cd frontend
npm install
npm start          # → http://localhost:3000
```

### Backend
```bash
cd backend
pip install fastapi uvicorn      # or: pip install -r requirements.txt (add one if you like)
uvicorn main:app --reload        # → http://localhost:8000
```

> **Heads-up (CORS):** the browser at `:3000` calling the API at `:8000` is cross-origin.
> Add FastAPI's `CORSMiddleware` in `backend/main.py` (allow `http://localhost:3000`) in
> Part 4, or the submit request will be blocked.
>
> **Heads-up (zustand):** `store.js` imports `zustand` directly; if `npm start` errors that
> it can't resolve `zustand`, run `npm install zustand` in `frontend/`.

---

## 📤 Submission

The instructions PDF **does not specify a submission method** — it only lists
`recruiting@vectorshift.ai` as the contact for questions.

**Before submitting, confirm the expected format with your recruiter.** It is typically one
of:
- a link to a (public or shared) **GitHub repository**, or
- a **zipped** project (exclude `node_modules/` and any virtualenv).

Whatever the format, make sure a reviewer can get it running from a clean checkout with the
commands above. When in doubt, email **recruiting@vectorshift.ai**.

---

## 💡 Suggested Order of Attack

1. **Part 1** first — the abstraction pays off in every later part.
2. **Part 3** next — building the Text node's dynamic behavior on top of your abstraction is
   a great test of whether the abstraction is actually flexible.
3. **Part 4** — wire the backend; it's self-contained.
4. **Part 2 (styling)** last — polish once the structure is stable, so you're not restyling
   moving targets. (Do rough styling as you go if it helps you work.)
