# Node Reference

Every node available in the pipeline builder, what it does, and its inputs/outputs.
This same information is available **inside the app** — click **Node Guide** (📖) in the header,
or hover a toolbar chip / a node's title for a tooltip.

> Convention: **outputs** are handles on the **right** of a node; **inputs** are on the **left**.
> Wire an output into an input to connect nodes. The node lineup is tailored to VectorShift's
> market — **private-equity deal workflows** (sourcing → screening → diligence → memo).

## Core building blocks

### Input  ·  _I/O_
Entry point of the pipeline — feeds a value (text or a file) in for downstream nodes.
- **Inputs:** —
- **Outputs:** value
- **Fields:** Name · Type (Text / File)

### Output  ·  _I/O_
End point of the pipeline — exposes a final result (text or image).
- **Inputs:** value
- **Outputs:** —
- **Fields:** Name · Type (Text / Image)

### LLM  ·  _AI_
Calls a large language model. Wire in a system prompt and a user prompt; outputs the response.
- **Inputs:** system, prompt
- **Outputs:** response
- **Fields:** Model (gpt-4 / gpt-4o / claude-opus / claude-sonnet)

### Text  ·  _Text_
A text / template block. Type `{{ variables }}` to auto-create input handles you can wire values
into. The box grows as you type.
- **Inputs:** one per `{{ variable }}` (created dynamically)
- **Outputs:** output
- **Fields:** the text/template itself

## Logic & lists

### Condition  ·  _Logic_
Routes the flow by a rule — sends the pipeline down the **True** or **False** branch
(e.g. gate an IC memo on whether the deal fits the mandate).
- **Inputs:** input
- **Outputs:** True, False
- **Fields:** Condition (e.g. `deal score >= 7`)

### Merge  ·  _Logic_
Combines multiple branches into one. **Pick First** takes the first available value;
**Join All** returns them as a list.
- **Inputs:** 1, 2
- **Outputs:** output
- **Fields:** Mode (Pick First / Join All)

### Filter List  ·  _List_
Filters a list, keeping (or dropping) items that match a condition.
- **Inputs:** list
- **Outputs:** output
- **Fields:** Keep where (predicate) · Action (Keep / Drop)

## Documents & RAG

### Document Loader  ·  _Data_
Loads a deal document (CIM, financials, contract, data room) into the pipeline for extraction,
indexing, or search. A source node — it starts a diligence flow.
- **Inputs:** —
- **Outputs:** document
- **Fields:** Document (CIM / Financials / Contract / Data Room / Other) · Scan (OCR)

### Context Builder  ·  _Knowledge_
Ingests documents into a vector store — chunks and embeds them to build a searchable **context**
(the RAG backend).
- **Inputs:** documents
- **Outputs:** context
- **Fields:** Context name · Embedding model · Chunk size

### Context Search  ·  _Knowledge_
Retrieves the most relevant chunks from a context / vector store for a query (RAG retrieval).
Wire a **Context Builder**'s output into its `context` input.
- **Inputs:** context, query
- **Outputs:** results
- **Fields:** Results (top-K) · Rerank

### Web Scraper  ·  _Data_
Fetches and extracts content from a web page or site (by URL) for use downstream.
- **Inputs:** url
- **Outputs:** content
- **Fields:** URL · Crawl depth

## Utility

### Note  ·  _Utility_
A free-text sticky note for annotating the canvas. Has no connections.
- **Inputs:** —
- **Outputs:** —
- **Fields:** the note text

---

## Example pipeline (RAG over a data room)
```
Document Loader (CIM) ──▶ Context Builder ──(context)──▶ Context Search ──▶ LLM ──▶ Output
                                          Input ("key risks?") ──(query)──┘
Condition ("fits mandate?") can gate whether the flow continues.
```

_This file is generated to match `frontend/src/nodes/definitions.js`. If you add or change a node
there (including its `description`), update this doc and the in-app Guide reflects it automatically._
