# How to Run Vector Shift

This project consists of a React frontend and a FastAPI backend. It allows building and running LLM pipelines.

---

## Prerequisites
Before running the project, you must set up the backend environment variables.

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file (if it doesn't already exist):
   ```bash
   touch .env
   ```
3. Populate the `.env` file with the following variables:
   ```env
   HF_TOKEN=hf_xxxxxxxxxxxxxxxx
   HF_LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
   HF_EMBED_MODEL=BAAI/bge-small-en-v1.5
   CHROMA_DIR=./chroma_store
   SQLITE_PATH=./vectorshift.db
   FRONTEND_ORIGIN=http://localhost:3000
   ```
   *Replace `HF_TOKEN` with your actual Hugging Face access token.*

---

## Method 1: Running with Docker (Recommended)
This is the simplest way to run the entire project. Both services will build and run inside isolated containers with a single command.

### 1. Start the containers
From the **repository root**, run:
```bash
docker compose up --build
```
*(You can append `-d` to run in detached/background mode: `docker compose up --build -d`)*

### 2. Access the Application
* **Frontend**: Open [http://localhost:3000](http://localhost:3000) in your browser.
* **Backend Health Check**: Open [http://localhost:8000](http://localhost:8000) (should return `{"Ping":"Pong"}`).

### 3. Stop the containers
If running in foreground mode, press `Ctrl + C`. 
If running in detached mode, run:
```bash
docker compose down
```
*(To wipe persistent database and vector store volumes, run `docker compose down -v`)*

---

## Method 2: Running Locally (Without Docker)
You can run the backend and frontend separately on your local machine.

### 1. Run the Backend (FastAPI)
You need Python 3.10+ installed.

1. Open a new terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server using `uvicorn`:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   *The backend will be running at `http://localhost:8000`.*

### 2. Run the Frontend (React)
You need Node.js (version 18+) installed.

1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
   *The frontend will automatically open at `http://localhost:3000`.*
