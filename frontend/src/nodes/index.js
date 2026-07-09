// index.js
// Builds the React Flow `nodeTypes` map from the data-driven definitions.
// Every config becomes a component: (props) => <BaseNode {...props} config={cfg} />.

import { BaseNode } from './BaseNode';
import { nodeDefinitions } from './definitions';

const makeNode = (config) => (props) => <BaseNode {...props} config={config} />;

export const nodeTypes = Object.fromEntries(
  nodeDefinitions.map((cfg) => [cfg.type, makeNode(cfg)])
);

export { nodeDefinitions };
