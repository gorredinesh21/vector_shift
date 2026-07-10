# PLAN — Making the Pipeline Builder Functional

This is the detailed build plan for turning the pipeline **builder** into a pipeline **runner**:
every node actually executes, data flows Input → … → Output, and results come back to the UI.

> ## 🔒 Golden rule
> On the office laptop I **only write code**. I **never run** the AI/ML stack here — no
> `pip install` of torch/transformers/langchain/chroma, no model calls, no scraping, no server
> runs. **All testing happens on the personal laptop.** Every "How to test" below is for you to run
> there.

---

## 1. Locked decisions

- **AI over HF Inference API** (LLM + embeddings) via an `HF_TOKEN`. **No local models.**
- **Model choice:** pick from what the token can actually reach — see `scripts/check_models.py` (§11).
  Prefer small/instruct models; get "reasoning" via prompting, "agentic" via a LangChain tool-agent
  in the scraper node.
- **RAG:** chunk ≈ 700 chars, **top-k = 7**, **no rerank**, **one Chroma collection per document**.
- **Web Scraper:** LLM + **DuckDuckGo** search (`ddgs`, no key) → scrape **≤10 sites concurrently**
  (asyncio + httpx) → LLM summarizes. **Fallback:** if search fails/empty, LLM proposes URLs.
- **Orchestration:** our **own DAG engine** runs the pipeline (deterministic topo order). **Each node
  is a function** `execute(inputs, config) -> outputs`. **LangChain is used inside nodes only.**
- **Persistence:** **SQLite** — saved pipelines, run history, context registry.
- **UX:** a separate **Run** button; each node has a **"view I/O"** button to inspect inputs/outputs.
- **Excluded:** Redis, WebSockets, auth.

---

## 2. Dependencies (install on personal laptop)

Add to `backend/requirements.txt`:
```
fastapi
uvicorn
pydantic
python-dotenv
huggingface_hub            # InferenceClient (LLM + embeddings)
langchain
langchain-community        # DuckDuckGo tool, loaders
langchain-huggingface      # HF LLM + embeddings wrappers
langchain-chroma           # Chroma vector store
chromadb                   # local persistent vector DB
httpx                      # async HTTP for the scraper
beautifulsoup4             # HTML extraction
lxml                       # fast parser for bs4
ddgs                       # DuckDuckGo search (no key)
pypdf                      # PDF parsing
python-docx                # DOCX parsing
pandas                     # CSV/XLSX parsing
pytest                     # tests
respx                      # mock httpx in tests (optional)
```
Frontend needs **no new packages** (React Flow + Zustand already present).

---

## 3. Environment & config

**`backend/.env`** (never committed — add `.env` to `.gitignore`):
```
HF_TOKEN=hf_xxx                       # your Hugging Face token
HF_LLM_MODEL=<chosen from check_models.py>
HF_EMBED_MODEL=BAAI/bge-small-en-v1.5 # or chosen embedding model
CHROMA_DIR=./chroma_store             # where per-doc collections live
SQLITE_PATH=./vectorshift.db
```
`config.py` loads these with `python-dotenv` and exposes them; every service imports from there so
there are no scattered `os.getenv` calls.

---

## 4. Architecture & execution flow

```
Frontend  ──"Run"──▶  POST /pipelines/run  { nodes, edges }
                                │
                        engine/executor.py
                        1. topological sort (reuse DAG logic)
                        2. for each node in order:
                             - resolve inputs from incoming edges
                               (upstream node's output handle → this node's input handle)
                             - executor = registry[node.type]
                             - outputs = executor(inputs, node.data)
                             - store outputs; skip nodes on a Condition's untaken branch
                        3. persist run to SQLite
                                │
        ◀── { results: {nodeId: {inputs, outputs, status, error?}}, final } ──
```

**Node executor contract (every node obeys this):**
```python
def execute(inputs: dict, config: dict) -> dict:
    # inputs : { input_handle_id : value }  (from upstream)
    # config : node.data                    (the field values set in the UI)
    # returns: { output_handle_id : value } (fed downstream)
```

**Branching:** `Condition` returns a value on **only** the `true` OR `false` output handle. The engine
marks nodes whose required inputs never arrived as **skipped**, so the untaken branch doesn't run.
`Merge` emits whichever input arrived first (or joins all).

---

## 5. Data contracts (`schemas.py`)

```python
class NodeIn(BaseModel):
    id: str
    type: str
    data: dict = {}                 # field values from the UI

class EdgeIn(BaseModel):
    source: str
    target: str
    sourceHandle: str | None = None
    targetHandle: str | None = None

class RunRequest(BaseModel):
    nodes: list[NodeIn]
    edges: list[EdgeIn]

class NodeResult(BaseModel):
    inputs: dict
    outputs: dict
    status: str                     # "done" | "skipped" | "error"
    error: str | None = None

class RunResponse(BaseModel):
    results: dict[str, NodeResult]  # keyed by node id
    final: dict                     # Output-node values
```

---

## 6. SQLite schema (`db.py`)

```
pipelines(  id TEXT PK, name TEXT, graph_json TEXT, created_at, updated_at )
runs(       id TEXT PK, pipeline_id TEXT NULL, results_json TEXT, status TEXT, created_at )
contexts(   id TEXT PK, doc_name TEXT, collection TEXT, chunk_size INT, count INT, created_at )
```
- **pipelines** — save/load a canvas.
- **runs** — history of executions + their results.
- **contexts** — registry mapping a built Chroma collection to its source document.

---

## 7. Backend — file by file

> For each: **Role**, **Does**, **Key functions**, **How to test** (run on personal laptop).

### `backend/config.py`
- **Role:** single source of settings.
- **Does:** loads `.env`, exposes `HF_TOKEN`, model names, paths.
- **Key:** `settings` object / module-level constants.
- **Test:** `python -c "import config; print(config.HF_LLM_MODEL, bool(config.HF_TOKEN))"` → prints model + `True`.

### `backend/schemas.py`
- **Role:** request/response validation (see §5).
- **Test:** `pytest tests/test_schemas.py` — build a `RunRequest` from a sample dict; assert fields parse; assert bad input raises `ValidationError`.

### `backend/db.py`
- **Role:** SQLite persistence.
- **Does:** `init_db()` creates tables; CRUD for pipelines/runs/contexts.
- **Key:** `save_pipeline`, `get_pipeline`, `list_pipelines`, `save_run`, `list_runs`, `register_context`, `get_context`.
- **Test:** `pytest tests/test_db.py` against a temp DB — insert a pipeline, read it back, assert equal; insert a run; register a context and fetch it.

### `backend/services/hf_llm.py`
- **Role:** all LLM calls.
- **Does:** wraps HF `InferenceClient.chat_completion` (or `text_generation`); **retry with backoff** on 503 "model loading"; a `complete(system, prompt) -> str` and a `judge(question) -> bool` helper (for Condition).
- **Key:** `complete()`, `judge_boolean()`, internal `_with_retry()`.
- **Test:**
  - *Unit (no network):* `pytest tests/test_hf_llm.py` with the HF client **mocked** — assert retry triggers on a simulated 503, assert `judge_boolean("yes")` parses to `True`.
  - *Live smoke (personal laptop, needs token):* `python -m services.hf_llm "Say hello"` prints a real completion.

### `backend/services/hf_embeddings.py`
- **Role:** turn text into vectors via HF API.
- **Does:** `embed(texts: list[str]) -> list[list[float]]` using `InferenceClient.feature_extraction`; batches requests.
- **Test:**
  - *Unit:* mock client, assert batching + output shape.
  - *Live smoke:* `python -m services.hf_embeddings "hello world"` prints the vector length (e.g. 384) — proves the model works.

### `backend/services/vectorstore.py`
- **Role:** Chroma, one collection per document.
- **Does:** `build(doc_name, chunks) -> collection_id` (embeds via `hf_embeddings`, persists to `CHROMA_DIR`); `search(collection_id, query, k=7) -> list[str]`.
- **Key:** `build()`, `search()`, `chunk_text(text, size=700)`.
- **Test:**
  - *Unit:* `chunk_text` splits a long string into ~700-char pieces (pure function, safe to run anywhere).
  - *Live:* build a collection from a paragraph, `search("...", k=7)`, assert it returns ≤7 relevant chunks.

### `backend/services/search.py`
- **Role:** web search tool for the scraper.
- **Does:** `search_links(query, max_results=10) -> list[str]` via `ddgs`; **fallback** → if it errors/returns empty, call `hf_llm` to propose candidate URLs.
- **Test:**
  - *Unit:* mock `ddgs` → assert it returns links; simulate failure → assert the LLM-fallback path is taken.
  - *Live:* `python -m services.search "best vector databases"` prints real links.

### `backend/services/scraper.py`
- **Role:** fetch + extract page text concurrently.
- **Does:** `scrape_many(urls) -> list[{url, text}]` — `asyncio.gather` over `httpx.AsyncClient`, capped at 10, per-site timeout + error isolation; BeautifulSoup extracts main text.
- **Key:** `scrape_one(client, url)`, `scrape_many(urls)`.
- **Test:**
  - *Unit:* `respx`-mocked HTTP → assert concurrent calls, assert a failing site doesn't crash the batch.
  - *Live:* `python -m services.scraper https://example.com` prints extracted text.

### `backend/services/parsers.py`
- **Role:** document → text, per file type.
- **Does:** `parse(path) -> str` dispatching by extension: `.pdf`→pypdf, `.docx`→python-docx, `.csv/.xlsx`→pandas, `.txt/.md`→read.
- **Test:** `pytest tests/test_parsers.py` with a tiny sample of each type in `tests/fixtures/` → assert non-empty text and a known snippet.

### `backend/engine/registry.py`
- **Role:** map `node.type` → executor function.
- **Does:** a dict populated by importing all node modules.
- **Test:** `pytest tests/test_registry.py` → assert every UI node type (from a known list) has a registered executor.

### `backend/engine/executor.py`
- **Role:** the orchestrator (heart of the build).
- **Does:** topo-sort; per node resolve inputs from edges; call executor; store outputs; handle `skipped` branches; catch per-node errors; assemble `RunResponse`.
- **Key:** `run_pipeline(nodes, edges) -> RunResponse`, `_resolve_inputs(node, edges, outputs)`, `_topo_order(...)`.
- **Test:** `pytest tests/test_executor.py` with **fake executors** (no AI): 
  - linear A→B→C runs in order, values propagate;
  - a Condition routes down one branch and the other is `skipped`;
  - a node raising an error is reported as `status:"error"` without killing the run.

### `backend/nodes/` (executors, grouped by category)
Each module registers its executors in `registry.py`. All are testable with plain inputs (AI-backed
ones mock the service).

| File | Nodes | Notes |
|---|---|---|
| `nodes/io.py` | Input, Output | passthrough/collect |
| `nodes/text.py` | Text | `{{var}}` substitution from inputs |
| `nodes/logic.py` | Condition, Filter List, Merge | Condition→`hf_llm.judge`; Filter→LLM per item (batched); Merge→pick-first/join-all |
| `nodes/llm.py` | LLM | `hf_llm.complete(system, prompt)` |
| `nodes/documents.py` | Document Loader, Context Builder, Context Search | parsers / vectorstore.build / vectorstore.search(k=7) |
| `nodes/web.py` | Web Scraper | search → scrape_many → LLM summarize (the agentic node) |

- **Test each:** `pytest tests/test_nodes_*.py` — feed sample `inputs`+`config`, assert `outputs`.
  For AI nodes, **mock** `hf_llm`/`hf_embeddings`/`search`/`scraper` so tests are fast and offline.
  Example: Text node with `config={'text':'Hi {{name}}'}` and `inputs={'name':'Sam'}` → `{'output':'Hi Sam'}`.

### `backend/main.py` (extend)
- **Role:** HTTP surface.
- **Adds:** `POST /pipelines/run` (calls `run_pipeline`, saves the run); `POST /pipelines` (save),
  `GET /pipelines` + `GET /pipelines/{id}` (load), `GET /runs` (history). Keeps existing `/pipelines/parse`.
- **Test:** `pytest tests/test_api.py` with FastAPI `TestClient` and mocked node services — POST a small
  graph to `/run`, assert `results` + `final`; save then load a pipeline; assert a run appears in history.

### `backend/scripts/check_models.py` (run first, personal laptop)
- **Role:** decide which HF model to use.
- **Does:** probes a shortlist of small serverless-friendly instruct models against your token; prints
  which respond, their latency, and a sample output; recommends the best. (Shortlist candidates:
  `meta-llama/Llama-3.2-3B-Instruct`, `Qwen/Qwen2.5-7B-Instruct`, `mistralai/Mistral-7B-Instruct-v0.3`,
  `microsoft/Phi-3.5-mini-instruct`, `google/gemma-2-2b-it`, plus an embedding check for
  `BAAI/bge-small-en-v1.5`.)
- **Test/Run:** `python scripts/check_models.py` → copy the recommended model id into `.env`.

---

## 8. Frontend — file by file (additions only)

### `frontend/src/store.js` (extend)
- **Adds:** `runResults` (per-node inputs/outputs/status), `runStatus` ('idle'|'running'|'done'|'error'),
  `setRunResults`, `setNodeRunStatus`.
- **Test:** `store.test.js` — set run results, assert retrievable; reset clears them.

### `frontend/src/RunButton.js` (new)
- **Role:** trigger a run.
- **Does:** POSTs the graph to `/pipelines/run`; sets `runStatus`; stores results; shows spinner while running.
- **Test:** `RunButton.test.js` (RTL) — mock `fetch`, click Run, assert POST body has nodes/edges and
  results land in the store.

### `frontend/src/NodeIO.js` (new)
- **Role:** the "view I/O" popover.
- **Does:** given a node id, reads `runResults[nodeId]` and shows its **inputs** and **outputs** (and error).
- **Test:** `NodeIO.test.js` — seed store with a node result, render, assert inputs/outputs shown.

### `frontend/src/nodes/BaseNode.js` (extend)
- **Adds:** a small **"I/O" button** in the node header that opens `NodeIO`; a run-status dot
  (idle/running/done/error) driven by the store.
- **Test:** render a node, seed a result, click the I/O button → popover appears with values.

### `frontend/src/App.js` (extend)
- **Adds:** `<RunButton />` in the header actions (next to Submit).

### `frontend/src/index.css` (extend)
- **Adds:** styles for the Run button, node run-status dot, and the I/O popover (reusing the glass tokens).

### (Phase 5) `frontend/src/PipelinesPanel.js` (new, optional)
- **Role:** save/load pipelines + view run history via the new endpoints.
- **Test:** RTL with mocked fetch — save, then load, assert the graph is restored.

---

## 9. Per-node executor specs

| Node | inputs → outputs | config (fields) | Uses |
|---|---|---|---|
| **Input** | — → `value` | name, type | — |
| **Output** | `value` → (final) | name | — |
| **Text** | `{{vars}}` → `output` | text template | string format |
| **Merge** | `path1,path2` → `output` | mode | pick-first / join-all |
| **Condition** | `input` → `true` \| `false` | condition | `hf_llm.judge_boolean` |
| **Filter List** | `list` → `output` | predicate, action | `hf_llm` per item (batched) |
| **LLM** | `system,prompt` → `response` | model | `hf_llm.complete` |
| **Document Loader** | — → `document` | docType, ocr | `parsers.parse` |
| **Context Builder** | `documents` → `context` | contextName, embedModel, chunkSize | `vectorstore.build` (+ `db.register_context`) |
| **Context Search** | `context,query` → `results` | topK(=7) | `vectorstore.search` |
| **Web Scraper** | `url`/query → `content` | url, sources | `search` → `scraper.scrape_many` → `hf_llm` summarize |
| **Note** | — | note | (no execution) |

---

## 10. Web Scraper flow (with fallback)

```
query ─▶ search.search_links(query)          # DuckDuckGo (ddgs), no key
          │  success → real URLs
          │  fail/empty → hf_llm proposes candidate URLs   ← fallback
          ▼
        scraper.scrape_many(urls[:10])        # asyncio + httpx, concurrent, per-site error isolation
          ▼
        hf_llm.complete(summarize all pages, preserve context)  → content
```

---

## 11. HF model selection (do this first)
1. Put your `HF_TOKEN` in `backend/.env` (personal laptop).
2. `python scripts/check_models.py` → it prints which shortlisted models your token can call, with
   latency + a sample answer, and recommends one.
3. Paste the recommended id into `HF_LLM_MODEL` (and confirm `HF_EMBED_MODEL`).
4. Everything else reads from `.env`.

---

## 12. Phase → files map & effort *(solo + AI)*

| Phase | Files | Effort |
|---|---|---|
| **0 — Engine + wiring** | config, schemas, db, engine/*, hf_llm, main(/run), RunButton, store | 3–4 d |
| **1 — Simple nodes + I/O viewer** | nodes/io, nodes/text, nodes/logic(Merge), NodeIO, BaseNode | 2–3 d |
| **2 — LLM logic** | nodes/llm, nodes/logic(Condition, Filter) | 2–3 d |
| **3 — Docs + RAG** | parsers, hf_embeddings, vectorstore, nodes/documents | 4–6 d |
| **4 — Web Scraper** | search, scraper, nodes/web | 2–3 d |
| **5 — Persistence & polish** | db wiring, save/load endpoints, PipelinesPanel, error UI | 3–4 d |

MVP end-to-end (0–2) ≈ **1.5–2 weeks**; full (0–5) ≈ **3–4.5 weeks**.

---

## 13. Testing strategy (overall)
- **Pure logic** (schemas, db, executor, registry, parsers, chunking) → plain `pytest`, no network.
- **AI/network services** (hf_llm, hf_embeddings, vectorstore, search, scraper) → **mocked** unit tests
  for logic + retry paths, plus a **live smoke** (`python -m services.<x> ...`) on the personal laptop.
- **Node executors** → `pytest` with the services mocked, asserting `inputs+config → outputs`.
- **API** → FastAPI `TestClient` with mocked services.
- **Frontend** → React Testing Library with mocked `fetch`.
- **End-to-end** (personal laptop): start backend + frontend, build Input→Text→LLM→Output, click Run,
  confirm the floating result + per-node I/O.

---

## 14. How to run (personal laptop)
```bash
# backend
cd backend
pip install -r requirements.txt
# put HF_TOKEN etc. in .env
python scripts/check_models.py        # pick a model → .env
uvicorn main:app --reload             # :8000

# frontend
cd frontend
npm install
npm start                             # :3000
```

---

## 15. Risks (carry into the build)
- **Serverless model availability** — a chosen model may 503 ("loading"); retry/backoff handles it;
  `check_models.py` avoids picking dead ones.
- **Filter List latency** — one LLM call per item; batch to keep it sane.
- **DuckDuckGo rate limits / bot-blocked or JS-only pages** — per-site error isolation + LLM-URL fallback;
  BeautifulSoup only sees static HTML.
- **Blocking runs** — several HF calls per run; UI spins (acceptable, per decision).

---

## 16. Build order (recommendation)
Build the **thin vertical slice first**: Phase 0 + `Input → Text → LLM → Output`. That proves the
engine end-to-end. Then layer on RAG (Phase 3, the impressive part), then the scraper, then persistence.
**Nothing is built until you say "start Phase 0."**
