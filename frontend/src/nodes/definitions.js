// definitions.js
// The entire node catalog as data. Each entry is a config object consumed by
// BaseNode. Adding a node here (and nothing else) makes it fully functional:
// it shows in the toolbar, drops on the canvas, renders, and connects.
//
// Handle:  { id, type: 'source'|'target', side: 'left'|'right', label? }
// Field:   { name, label, kind, default?, options?, min?, max?, step?, placeholder? }
//   kinds: text | textarea | select | number | slider | checkbox

import { TextNodeBody } from './textNode';

export const nodeDefinitions = [
  // ── Original 4, refactored onto the abstraction ────────────────────────────
  {
    type: 'customInput',
    title: 'Input',
    category: 'io',
    icon: 'LogIn',
    handles: [{ id: 'value', type: 'source', side: 'right' }],
    fields: [
      { name: 'inputName', label: 'Name', kind: 'text',
        default: (id) => id.replace('customInput-', 'input_') },
      { name: 'inputType', label: 'Type', kind: 'select', options: ['Text', 'File'], default: 'Text' },
    ],
  },
  {
    type: 'customOutput',
    title: 'Output',
    category: 'io',
    icon: 'LogOut',
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
    handles: [
      { id: 'input', type: 'target', side: 'left' },
      { id: 'true', type: 'source', side: 'right', label: 'True' },
      { id: 'false', type: 'source', side: 'right', label: 'False' },
    ],
    fields: [{ name: 'condition', label: 'Condition', kind: 'text', placeholder: 'e.g. score > 0.5' }],
  },
  {
    // multiple INPUT handles
    type: 'merge',
    title: 'Merge',
    category: 'logic',
    icon: 'Merge',
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
    // many + varied field kinds (select + number + slider)
    type: 'semanticSearch',
    title: 'Semantic Search',
    category: 'knowledge',
    icon: 'Search',
    handles: [
      { id: 'query', type: 'target', side: 'left' },
      { id: 'results', type: 'source', side: 'right' },
    ],
    fields: [
      { name: 'kb', label: 'Knowledge Base', kind: 'select', options: ['Docs', 'Support KB', 'Product KB'], default: 'Docs' },
      { name: 'topK', label: 'Top K', kind: 'number', default: '3', min: 1, max: 20 },
      { name: 'threshold', label: 'Threshold', kind: 'slider', default: '0.7', min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    // file data flow + checkbox field
    type: 'fileLoader',
    title: 'File Loader',
    category: 'data',
    icon: 'FileUp',
    handles: [
      { id: 'file', type: 'target', side: 'left' },
      { id: 'output', type: 'source', side: 'right' },
    ],
    fields: [
      { name: 'fileType', label: 'File Type', kind: 'select', options: ['PDF', 'CSV', 'Image', 'Text'], default: 'PDF' },
      { name: 'ocr', label: 'Enable OCR', kind: 'checkbox', default: false },
    ],
  },
  {
    // realistic data-loader node
    type: 'webScraper',
    title: 'Web Scraper',
    category: 'data',
    icon: 'Globe',
    handles: [
      { id: 'trigger', type: 'target', side: 'left' },
      { id: 'output', type: 'source', side: 'right' },
    ],
    fields: [
      { name: 'url', label: 'URL', kind: 'text', placeholder: 'https://example.com' },
      { name: 'depth', label: 'Crawl Depth', kind: 'number', default: '1', min: 1, max: 5 },
    ],
  },
  {
    // the empty / no-handle edge case
    type: 'note',
    title: 'Note',
    category: 'utility',
    icon: 'StickyNote',
    handles: [],
    fields: [{ name: 'note', kind: 'textarea', placeholder: 'Jot a note…' }],
  },
];
