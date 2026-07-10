# HANDOVER

Everything needed to pick this project up: current state, how to run and test it, what's done vs.
pending, and the gotchas. Companion docs: `README.md` (assessment brief), `EXECUTION.md` (what was
built + why), `NODES.md` (node abstraction + catalog), `PLAN.md` (the functional-build plan).

---

## 1. What this project is
A visual **AI pipeline builder + runner** (a VectorShift-style tool). You drag nodes onto a canvas,
wire them into a graph, and **Run** it — each node executes its real action (LLM, RAG, scraping,
parsing) and data flows Input → … → Output.

- **Frontend:** React 18 + React Flow + Zustand.
- **Backend:** FastAPI + a custom DAG execution engine; AI via the **Hugging Face Inference API**.

## 2. Branches (important)
| Branch | State |
|--------|-------|
| `submission` | **Frozen** snapshot of the finished *builder* (non-functional nodes). Submit from here if needed. |
| `main` | Active — the **functional build** (execution engine + real node executors) lives here. |

`git checkout submission` to get the frozen version; `git checkout main` for the functional work.

---

## 3. Status

| Area | State |
|------|-------|
| Pipeline **builder** UI (nodes, edges, resize, undo/redo, delete, guide, styling) | ✅ Done & verified |
| Part 4 **parse** endpoint (node/edge count + DAG) | ✅ Done & tested |
| **Execution engine** + node executors (Run flow) | ✅ Code written · ⚠️ **not yet run end-to-end** |
| Frontend Run UI (Run button, per-node I/O viewer, status dots) | ✅ Written · frontend tests + build pass |

> ⚠️ **The functional backend has not been executed yet** — it was written on a machine where the
> AI/ML stack must not run. First real execution + debugging happens on your personal laptop
> (see §6). The pure-logic tests should pass immediately; AI paths depend on your token/model.

---

## 4. Architecture (functional build)

```
Frontend "Run" ─▶ POST /pipelines/run { nodes, edges }
                        │
                engine/executor.py  → topo sort → run each node's executor →
                        │              feed outputs downstream, skip untaken branches
                        ▼
          { results: {nodeId:{inputs,outputs,status,error}}, final }
```
- **Live status:** `/pipelines/run/stream` streams per-node progress via **SSE** (plain HTTP, not
  WebSockets). The running node **lights up** on the canvas; finished nodes show green/grey/red dots.
  `run_pipeline` (non-stream `/pipelines/run`) still exists for tests/simple use.
- **Orchestrator is dumb + deterministic; nodes are smart.** Each node = `execute(inputs, config) -> outputs`, registered via `@register("type")`.
- AI lives inside nodes over the HF Inference API; **Chroma = one collection per document** (RAG).

**Backend layout**
```
backend/
  config.py            settings from .env (HF token, models, paths)
  errors.py            one exception family (PipelineError, NodeError, ...)
  schemas.py           Pydantic request/response
  db.py                SQLite: pipelines, runs, contexts
  engine/
    handles.py         strip `${nodeId}-` prefix from handle ids
    registry.py        node-type -> executor (decorator)
    executor.py        the DAG runner (branch-skip + error isolation)
  services/
    hf_llm.py          LLM via HF (chat_completion) + retry/backoff
    hf_embeddings.py   embeddings via HF (feature-extraction)
    vectorstore.py     Chroma per-doc collection: build() / search()
    search.py          DuckDuckGo (ddgs) + LLM-URL fallback
    scraper.py         async concurrent fetch + BeautifulSoup extract
    parsers.py         pdf/docx/csv/txt -> text
    structured.py      FORCE + parse LLM output (boolean / JSON / list)
  nodes/               io, text, logic, llm, documents, web, note (executors)
  main.py              /pipelines/{parse,run}, save/load, runs, contexts
  scripts/check_models.py   probe which HF models your token can reach
  test_executor.py, test_nodes.py
```

**Frontend additions**
```
src/api.js        all backend calls in one place
src/RunButton.js  triggers /pipelines/run, stores results
src/NodeIO.js     popover: a node's inputs/outputs after a run
src/store.js      + run state (runStatus, runResults, runFinal)
src/nodes/BaseNode.js  + "ⓘ view I/O" button + run-status dot
```

---

## 5. Environment
`backend/.env` (git-ignored — holds the HF token):
```
HF_TOKEN=...
HF_LLM_MODEL=<set from check_models.py>
HF_EMBED_MODEL=BAAI/bge-small-en-v1.5
CHROMA_DIR=./chroma_store
SQLITE_PATH=./vectorshift.db
FRONTEND_ORIGIN=http://localhost:3000
```
> 🔐 The token was shared in chat during development — **rotate it** on Hugging Face.

---

## 6. How to run (personal laptop)
```bash
# 1) backend
cd backend
pip install -r requirements.txt
python scripts/check_models.py        # pick a reachable LLM -> paste into .env (HF_LLM_MODEL)
uvicorn main:app --reload             # http://localhost:8000

# 2) frontend (new terminal)
cd frontend
npm install
npm start                             # http://localhost:3000
```
Build a pipeline, click **Run**, use each node's **ⓘ** button to inspect its inputs/outputs.

---

## 7. How to test

**Backend (pure logic — should pass immediately):**
```bash
cd backend && python -m pytest -v
# test_executor.py: linear flow, branch-skip, error isolation, Output collection
# test_nodes.py:    Text/Merge/IO nodes + structured-output parsing
```

**Backend services (live smoke — needs token + network):**
```bash
python -m services.hf_llm "Say hello"
python -m services.hf_embeddings "hello world"
python -m services.search "best vector databases"
python -m services.scraper https://example.com
python -m services.parsers path/to/file.pdf
```

**Frontend:**
```bash
cd frontend && npm test          # RTL: submit flow + store/undo-redo (currently 6/6)
```

**End-to-end:** run both servers → `Input → Text → LLM → Output` → Run → confirm the inline result
and per-node I/O. Then RAG: `Document Loader → Context Builder → Context Search → LLM → Output`.

---

## 8. Node catalog (quick ref)
| Node | inputs → outputs | executor uses |
|------|------------------|---------------|
| Input | — → value | config.value |
| Output | value → (final) | — |
| Text | {{vars}} → output | template substitution |
| LLM | system, prompt → response | hf_llm |
| Condition | input → true \| false | hf_llm.judge_boolean |
| Filter List | list → output | hf_llm (batched) + structured |
| Merge | path1, path2 → output | pick-first / join-all |
| Document Loader | — → document | parsers.parse(config.path) |
| Context Builder | documents → context | vectorstore.build (Chroma per doc) |
| Context Search | context, query → results | vectorstore.search (top-7) |
| Web Scraper | query → summary | search → scraper → hf_llm summarize |
| Note | — | (no-op) |

---

## 9. Known issues / gotchas (read before debugging)
1. **Not run end-to-end yet** — expect to fix small things on first run (imports, model ids, response shapes).
2. **HF serverless model availability** — a chosen model may 503 "loading" (retry is built in) or not be
   served at all. `check_models.py` picks a reachable one; big reasoning models often aren't free-served.
3. **Structured output** — Condition/Filter force YES/NO or JSON and parse defensively (`structured.py`),
   but a very off-format model can still mis-answer; tighten prompts if needed.
4. **DuckDuckGo** can rate-limit → the LLM-URL fallback kicks in. Scraper only sees **static HTML**
   (JS-heavy pages return little); per-site failures are isolated.
5. **Filter List latency** — one LLM pass over the list (batched); large lists are slow.
6. **Blocking runs** — a run makes several HF calls and the UI just spins (by design; no WebSockets).
7. **Document Loader** reads a **local file path** typed into the node (no upload UI yet).
8. **Stale servers** — if results look "old", kill anything already on :8000/:3000 and restart.
9. **Direct clients, not LangChain** — HF/Chroma/DuckDuckGo are called via their official clients
   (reliability); the DAG engine is ours. Swappable to LangChain if desired.

---

## 10. Recommended debug order
`pytest` (logic) → `check_models.py` → **Input→Text→LLM→Output** → **RAG** (Loader→Builder→Search)
→ **Web Scraper**. Get the thin slice working before the AI-heavy nodes.

## 11. Pending / next ideas
- File **upload** UI for Document Loader (instead of a path field).
- Optional live per-node status via polling (no WebSockets).
- Save/Load pipelines + run-history panel in the UI (endpoints already exist).
- Streaming LLM output.
