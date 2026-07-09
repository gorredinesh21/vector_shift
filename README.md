# VectorShift - Frontend Technical Assessment

This repository contains the template files and instructions for the **VectorShift Frontend Technical Assessment**. It is designed to evaluate your ability to create React/FastAPI integrations, build reusable component abstractions, implement dynamic UI logic, and apply clean designs.

---

## 📋 Assessment Overview

The assessment consists of **four key parts**:

### 1. Node Abstraction (Part 1)
- **Goal**: Create a reusable node abstraction (e.g., `BaseNode`) to avoid duplicating boilerplate logic across different node types.
- **Location**: `/frontend/src/nodes/`
- **Deliverables**: 
  - Refactor existing nodes (`inputNode.js`, `outputNode.js`, `llmNode.js`, `textNode.js`) to use the new abstraction.
  - Create **five new custom nodes** of your choosing to demonstrate the flexibility, scalability, and ease of creating new nodes using your abstraction.

### 2. Styling (Part 2)
- **Goal**: Design a cohesive, premium, and unified UI for the canvas, toolbar, nodes, and submit button.
- **Requirements**: Feel free to use any CSS framework or design libraries (e.g., Styled Components, Tailwind, CSS Modules) to create an appealing aesthetic inspired by or extending VectorShift's design language.

### 3. Text Node Logic (Part 3)
- **Goal**: Add advanced interactive features to the `TextNode` component:
  1. **Dynamic Resizing**: Make the width and height of the `TextNode` expand dynamically based on the amount of text entered into the input field.
  2. **Dynamic Variables & Handles**: Parse user inputs for double curly brackets (e.g., `{{ variable_name }}`) using a regular expression. When a valid JavaScript variable is typed, dynamically render a corresponding target Handle on the left side of the `TextNode`.

### 4. Backend Integration (Part 4)
- **Goal**: Connect the React Flow canvas to the FastAPI backend:
  1. **Frontend Submit**: Update `/frontend/src/submit.js` to send the complete pipeline structure (`nodes` and `edges`) to the backend via a POST request to `/pipelines/parse`.
  2. **Backend Parse**: Implement a graph traversal algorithm (e.g., DFS or Kahn's algorithm) in `/backend/main.py` to:
     - Count the total number of nodes.
     - Count the total number of edges.
     - Detect whether the pipeline forms a **Directed Acyclic Graph (DAG)**.
     - Return `{num_nodes: int, num_edges: int, is_dag: bool}`.
  3. **Frontend Alert**: Trigger a user-friendly alert or modal overlay displaying the analysis metrics once the backend response is received.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [Python 3.8+](https://www.python.org/)
- `pip` / `virtualenv`

### Running the Frontend
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm start
   ```
The app will be available at [http://localhost:3000](http://localhost:3000).

### Running the Backend
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install FastAPI and Uvicorn:
   ```bash
   pip install fastapi uvicorn
   ```
3. Run the development server:
   ```bash
   uvicorn main:app --reload
   ```
The backend API will run on [http://localhost:8000](http://localhost:8000).
