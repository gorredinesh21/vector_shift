// definitions.js
// The entire node catalog as data. Each entry is a config object consumed by
// BaseNode. Adding a node here (and nothing else) makes it fully functional:
// it shows in the toolbar, drops on the canvas, renders, and connects.
//
// Handle:  { id, type: 'source'|'target', side: 'left'|'right', label? }
// Field:   { name, label, kind, default?, options?, min?, max?, step?, placeholder? }
//   kinds: text | textarea | select | number | slider | checkbox
// description: one-line explanation shown in tooltips + the in-app Node Guide.

import { TextNodeBody } from './textNode';
import { ContextSearchBody } from './ContextSearchBody';

export const nodeDefinitions = [
  // ── Original 4, refactored onto the abstraction ────────────────────────────
  {
    type: 'customInput',
    title: 'Input',
    category: 'io',
    icon: 'LogIn',
    description: 'Entry point of the pipeline — feeds a value (text or a file) in for downstream nodes.',
    handles: [{ id: 'value', type: 'source', side: 'right' }],
    fields: [
      { name: 'inputName', label: 'Name', kind: 'text',
        default: (id) => id.replace('customInput-', 'input_') },
      { name: 'inputType', label: 'Type', kind: 'select', options: ['Text', 'File'], default: 'Text' },
      { name: 'value', label: 'Value', kind: 'textarea', placeholder: 'Starting value for the pipeline…' },
    ],
  },
  {
    type: 'customOutput',
    title: 'Output',
    category: 'io',
    icon: 'LogOut',
    description: 'End point of the pipeline — exposes a final result (text or image).',
    handles: [{ id: 'value', type: 'target', side: 'left' }],
    fields: [
      { name: 'outputName', label: 'Name', kind: 'text',
        default: (id) => id.replace('customOutput-', 'output_') },
      { name: 'outputType', label: 'Type', kind: 'select', options: ['Text', 'Image'], default: 'Text' },
    ],
  },
  {
    type: 'llm',
    title: 'LLM',
    category: 'llm',
    icon: 'Sparkles',
    description: 'Calls a large language model. Wire in a system prompt and a user prompt; outputs the response.',
    handles: [
      { id: 'system', type: 'target', side: 'left', label: 'system' },
      { id: 'prompt', type: 'target', side: 'left', label: 'prompt' },
      { id: 'response', type: 'source', side: 'right' },
    ],
    fields: [
      { name: 'model', label: 'Model', kind: 'select',
        options: ['gpt-4', 'gpt-4o', 'claude-opus', 'claude-sonnet'], default: 'gpt-4' },
    ],
  },
  {
    type: 'text',
    title: 'Text',
    category: 'text',
    icon: 'Type',
    description: 'A text / template block. Type {{ variables }} to auto-create input handles you can wire values into. Grows as you type.',
    handles: [{ id: 'output', type: 'source', side: 'right' }],
    // state lives in `text`; the body is custom (Part 3 dynamic-variable logic)
    fields: [{ name: 'text', kind: 'textarea', default: '{{input}}' }],
    renderBody: (props) => <TextNodeBody {...props} />,
  },

  // ── 7 new nodes (each stress-tests a different axis of the abstraction) ─────
  {
    // multiple OUTPUT handles / branching
    type: 'condition',
    title: 'Condition',
    category: 'logic',
    icon: 'GitBranch',
    description: 'Routes the flow by a rule — sends the pipeline down the True or False branch (e.g. gate a memo on deal fit).',
    handles: [
      { id: 'input', type: 'target', side: 'left' },
      { id: 'true', type: 'source', side: 'right', label: 'True' },
      { id: 'false', type: 'source', side: 'right', label: 'False' },
    ],
    fields: [{ name: 'condition', label: 'Condition', kind: 'text', placeholder: 'e.g. deal score >= 7' }],
  },
  {
    // multiple INPUT handles
    type: 'merge',
    title: 'Merge',
    category: 'logic',
    icon: 'Merge',
    description: 'Combines multiple branches into one. "Pick First" takes the first available value; "Join All" returns them as a list.',
    handles: [
      { id: 'path1', type: 'target', side: 'left', label: '1' },
      { id: 'path2', type: 'target', side: 'left', label: '2' },
      { id: 'output', type: 'source', side: 'right' },
    ],
    fields: [{ name: 'mode', label: 'Mode', kind: 'select', options: ['Pick First', 'Join All'], default: 'Pick First' }],
  },
  {
    // list-type node
    type: 'filterList',
    title: 'Filter List',
    category: 'list',
    icon: 'Filter',
    description: 'Filters a list, keeping (or dropping) items that match a condition.',
    handles: [
      { id: 'list', type: 'target', side: 'left' },
      { id: 'output', type: 'source', side: 'right' },
    ],
    fields: [
      { name: 'predicate', label: 'Keep where', kind: 'text', placeholder: 'item.value > 0' },
      { name: 'action', label: 'Action', kind: 'select', options: ['Keep', 'Drop'], default: 'Keep' },
    ],
  },
  {
    // RAG ingestion: take documents, chunk + embed them into a vector store ("context").
    type: 'contextBuilder',
    title: 'Context Builder',
    category: 'knowledge',
    icon: 'Database',
    description: 'Ingests documents into a vector store — chunks and embeds them to build a searchable context (the RAG backend).',
    handles: [
      { id: 'documents', type: 'target', side: 'left' },
      { id: 'context', type: 'source', side: 'right' },
    ],
    fields: [
      { name: 'contextName', label: 'Context name', kind: 'text', placeholder: 'e.g. project-atlas-dataroom' },
      { name: 'embedModel', label: 'Embedding model', kind: 'select',
        options: ['text-embedding-3-large', 'text-embedding-3-small', 'cohere-embed-v3'], default: 'text-embedding-3-large' },
      { name: 'chunkSize', label: 'Chunk size', kind: 'number', default: '512', min: 128, max: 2048 },
    ],
  },
  {
    // RAG retrieval: search across available contexts / vector stores for a query.
    type: 'contextSearch',
    title: 'Context Search',
    category: 'knowledge',
    icon: 'Search',
    description: 'Retrieves the most relevant chunks for a query — from a wired Context Builder OR a saved DB you select here.',
    handles: [
      { id: 'context', type: 'target', side: 'left', label: 'context' },
      { id: 'query', type: 'target', side: 'left', label: 'query' },
      { id: 'results', type: 'source', side: 'right' },
    ],
    // state init; the body is custom (existing-DB dropdown + top-K)
    fields: [
      { name: 'contextId', default: '' },
      { name: 'topK', default: '7' },
    ],
    renderBody: (props) => <ContextSearchBody {...props} />,
  },
  {
    // Load a deal document (CIM, financials, contract...) into the pipeline.
    // A source node: outputs the document for downstream extraction/Q&A.
    type: 'fileLoader',
    title: 'Document Loader',
    category: 'data',
    icon: 'FileUp',
    description: 'Loads a deal document (CIM, financials, contract, data room) into the pipeline for extraction or Q&A.',
    handles: [
      { id: 'document', type: 'source', side: 'right' },
    ],
    fields: [
      { name: 'path', label: 'File path', kind: 'text', placeholder: 'C:\\deals\\cim.pdf' },
      { name: 'docType', label: 'Document', kind: 'select', options: ['CIM', 'Financials', 'Contract', 'Data Room', 'Other'], default: 'CIM' },
      { name: 'ocr', label: 'Scan (OCR)', kind: 'checkbox', default: false },
    ],
  },
  {
    // Fetch + extract content from a web page/site by URL.
    type: 'webScraper',
    title: 'Web Scraper',
    category: 'data',
    icon: 'Globe',
    description: 'Researches a topic on the web (AI finds sites → scrapes them → AI summarizes without losing context).',
    handles: [
      { id: 'query', type: 'target', side: 'left' },
      { id: 'summary', type: 'source', side: 'right' },
    ],
    fields: [
      { name: 'query', label: 'Topic / question', kind: 'text', placeholder: 'e.g. EV battery market 2025' },
      { name: 'maxSites', label: 'Max sites', kind: 'number', default: '5', min: 1, max: 10 },
    ],
  },
  {
    // the empty / no-handle edge case
    type: 'note',
    title: 'Note',
    category: 'utility',
    icon: 'StickyNote',
    description: 'A free-text sticky note for annotating the canvas. Has no connections.',
    handles: [],
    fields: [{ name: 'note', kind: 'textarea', placeholder: 'Jot a note…' }],
  },
];
