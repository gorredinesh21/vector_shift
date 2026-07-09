# Nodes & the Node Abstraction

## The abstraction I followed

I built a **config-driven (data-driven) abstraction**. Every node is described by a plain data object,
and a single component — `BaseNode` — renders any node from that object. A node's definition looks like:

```js
{
  type: 'condition',            // unique key (toolbar chip + nodeTypes)
  title: 'Condition',
  category: 'logic',            // drives icon color / accent
  icon: 'GitBranch',            // any lucide-react icon
  description: 'Routes the flow by a rule…',   // shown in tooltips + Node Guide
  handles: [                    // connection points
    { id: 'input', type: 'target', side: 'left' },
    { id: 'true',  type: 'source', side: 'right', label: 'True' },
    { id: 'false', type: 'source', side: 'right', label: 'False' },
  ],
  fields: [                     // the editable inputs
    { name: 'condition', label: 'Condition', kind: 'text' },
  ],
  // optional escape hatch for custom bodies:
  // renderBody: ({ id, data, values, setField }) => <Custom .../>,
}
```

Field `kind`s supported: `text · textarea · select · number · slider · checkbox`.

## How this differs from the initial code

Originally each node was its **own file with duplicated markup** — the same wrapper `<div>`, inline
styles, title block, `useState` hooks, and `<Handle>` elements copied and tweaked in every file. Adding
a node meant copying ~40 lines and editing them; a style change meant editing every file.

Now there is **one** `BaseNode` and one list of data objects. The duplication is gone: the shell,
styling, field rendering, handle placement, and store syncing all live in one place.

## Why it's better

- **Reusability** — adding a node never touches `BaseNode`; it's just a new data entry.
- **Consistency** — every node shares the same styling and behavior automatically.
- **Speed** — a new node is a few lines of data, not a new file.
- **Single source of truth** — the toolbar, the `nodeTypes` map, and the in-app Node Guide are all
  generated from the same list, so nothing drifts out of sync.

## How it works

1. `definitions.js` holds the array of node configs.
2. `index.js` turns each config into a component: `(props) => <BaseNode {...props} config={cfg} />`,
   producing the `nodeTypes` map React Flow needs.
3. `BaseNode` renders the title (icon + category color), the body (each field via `NodeField`, or a
   custom `renderBody`), and the handles (auto-spaced on their side, with optional labels). It also
   writes field values into the Zustand store so the pipeline data stays complete.
4. The toolbar and the Node Guide iterate the same list, so new nodes appear everywhere.

## How to add a new node

Add one object to `nodeDefinitions` in `frontend/src/nodes/definitions.js`:

```js
{
  type: 'myNode',
  title: 'My Node',
  category: 'data',
  icon: 'Boxes',
  description: 'What it does.',
  handles: [
    { id: 'in',  type: 'target', side: 'left' },
    { id: 'out', type: 'source', side: 'right' },
  ],
  fields: [
    { name: 'mode', label: 'Mode', kind: 'select', options: ['A', 'B'], default: 'A' },
  ],
}
```

That's it — it now appears in the bottom toolbar, drops on the canvas, connects, and shows up in the
Node Guide. No other file changes.

---

## The new nodes I came up with

Beyond the 4 originals (Input, Output, LLM, Text), these are the nodes I designed and implemented,
chosen to reflect VectorShift's real market — **private-equity / RAG workflows** — and to stress-test
the abstraction on different axes (multiple outputs, multiple inputs, varied field types, no handles).

| Node | What it does |
|------|--------------|
| **Condition** | Routes the flow by a rule — sends the pipeline down a **True** or **False** branch (e.g. gate a memo on deal fit). *Multiple output handles.* |
| **Merge** | Combines multiple branches into one — "Pick First" takes the first available value, "Join All" returns them as a list. *Multiple input handles.* |
| **Filter List** | Filters a list, keeping (or dropping) items that match a condition. *List-type node.* |
| **Document Loader** | Loads a deal document (CIM, financials, contract, data room) into the pipeline for extraction or search. *Source node.* |
| **Context Builder** | The RAG ingestion backend — takes documents, chunks and embeds them into a vector store ("context"). *Text + select + number fields.* |
| **Context Search** | RAG retrieval — searches a context / vector store for a query and returns the most relevant chunks. *Pairs with Context Builder via its `context` handle.* |
| **Web Scraper** | Fetches and extracts content from a web page or site by URL. |
| **Note** | A free-text sticky note for annotating the canvas. *No handles — the empty edge case.* |

### Example RAG pipeline
```
Document Loader ──▶ Context Builder ──(context)──▶ Context Search ──▶ LLM ──▶ Output
                              Input ("query") ──────────┘
Condition ("fits mandate?") can gate whether the flow continues.
```
