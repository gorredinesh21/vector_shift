# VectorShift Assessment — Deliverables

Every deliverable extracted from the assessment PDF, split into **Quantitative** (objectively
verifiable — a count, a boolean, an exact format, or a pass/fail behavior) and **Qualitative**
(judged on subjective quality — design, flexibility, user-friendliness).

Legend: **Type** = Quantitative / Qualitative · **Status** = current state in this repo.

---

## 🔢 Quantitative deliverables (measurable / functional)

| ID | Part | Deliverable | Acceptance criteria | Status |
|----|------|-------------|---------------------|--------|
| N1 | 1 | Create **≥ 5 new node types** to demonstrate the abstraction | At least 5 distinct new nodes exist and are usable on the canvas | ✅ 7 delivered (Condition, Merge, Filter List, Semantic Search, File Loader, Web Scraper, Note) |
| N2 | 3 | Text node **width** changes as more text is entered | Node width visibly adjusts to input | ✅ Done |
| N3 | 3 | Text node **height** changes as more text is entered | Node height grows to fit input (textarea auto-resize) | ✅ Done |
| N4 | 3 | A **new left-side Handle per `{{ variable }}`** | One input handle created for each variable in the text | ✅ Done |
| N5 | 3 | Only **valid JS variable names** create a handle | `{{ 2bad }}`, `{{ a b }}` etc. create no handle; duplicates dedupe | ✅ Done |
| N6 | 4 | `submit.js` **sends nodes + edges** to `/pipelines/parse` on button click | POST fires with the full pipeline payload on click | ✅ Done — **test-verified** (submit.test.js) |
| N7 | 4 | Backend returns **`num_nodes`** (int) | Correct node count | ✅ Done — **test-verified** (test_main.py) |
| N8 | 4 | Backend returns **`num_edges`** (int) | Correct edge count | ✅ Done — **test-verified** (test_main.py) |
| N9 | 4 | Backend returns **`is_dag`** (bool) | Correct DAG / cycle detection (incl. self-loops) | ✅ Done (Kahn's) — **test-verified** (8 graph cases) |
| N10 | 4 | Response matches **exact format** `{num_nodes:int, num_edges:int, is_dag:bool}` | JSON shape + types match spec | ✅ Done — **test-verified** (exact keys + types) |
| N11 | 4 | An **alert triggers on response** and displays the 3 values | Feedback shows num_nodes, num_edges, is_dag after submit | ✅ Done (themed modal) — **test-verified** (ResultModal + submit tests) |

## 🎨 Qualitative deliverables (judged on quality)

| ID | Part | Deliverable | What "good" looks like | Status |
|----|------|-------------|------------------------|--------|
| Q1 | 1 | Create a **node abstraction** that speeds up creating new nodes and applying styles across nodes | Little/no duplicated code per node; adding a node is cheap; styles apply centrally | ✅ Config-driven `BaseNode` + `renderBody` escape hatch (0 base edits per node) |
| Q2 | 1 | New nodes **showcase the flexibility/efficiency** of the abstraction | Nodes vary meaningfully (handle counts, field types, edge cases) to prove flexibility | ✅ 7 nodes chosen to stress-test different axes |
| Q3 | 2 | Style components into an **appealing, unified design** | Cohesive look across canvas, toolbar, nodes, button; polished and consistent | ✅ Light-glass / warm-maroon system (please eyeball in browser) |
| Q4 | 4 | Alert presents results in a **user-friendly manner** | Clear, readable presentation of the metrics (not a raw dump) | ✅ Glass modal with labelled stat tiles + plain-language verdict |

---

## Summary

| Type | Count | Done |
|------|-------|------|
| Quantitative | 11 | 11 |
| Qualitative | 4 | 4 |
| **Total** | **15** | **15** |

> Source: *VectorShift – Frontend Technical Assessment Instructions.pdf*. Note the PDF asks for
> **5** new nodes (N1); this repo delivers **7**. All other items map 1:1 to the PDF text.
