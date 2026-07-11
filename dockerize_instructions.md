# Dockerize Instructions

Follow these steps exactly to containerize this project (React frontend + FastAPI backend) with
Docker. Everything runs with one command: `docker compose up --build`.

These instructions are self-contained: they include the **full contents** of every file to create.
Create each file at the exact path shown.

---

## 0. Prerequisites (verify before starting)
1. **Docker Desktop** is installed and running.
2. The file **`backend/.env`** exists and contains a valid Hugging Face token and a **reachable**
   model. It must look like this (values are the user's):
   ```
   HF_TOKEN=hf_xxxxxxxxxxxxxxxx
   HF_LLM_MODEL=<a model the token can call>
   HF_EMBED_MODEL=BAAI/bge-small-en-v1.5
   CHROMA_DIR=./chroma_store
   SQLITE_PATH=./vectorshift.db
   FRONTEND_ORIGIN=http://localhost:3000
   ```
   > If unsure the model works, run `cd backend && python scripts/check_models.py` first and put a
   > recommended model id into `HF_LLM_MODEL`. (The builder + DAG check work without a model; only
   > the **Run** feature needs one.)

Project layout (already exists):
```
<repo root>/
  backend/    FastAPI app; entrypoint is `main:app`; runs on port 8000; has requirements.txt and .env
  frontend/   Create React App; builds with `npm run build`; dev port 3000
```

---

## 1. Create `backend/Dockerfile`
Path: **`backend/Dockerfile`**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# build tools help wheels for numpy / pandas / lxml compile if needed
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# --host 0.0.0.0 so the container is reachable from the host machine
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 2. Create `backend/.dockerignore`
Path: **`backend/.dockerignore`**
```
__pycache__/
*.pyc
.pytest_cache/
chroma_store/
*.db
.env
venv/
.venv/
```
> Note: `.env` is intentionally excluded from the image (it's a secret). It is provided at run time
> by docker-compose via `env_file` (Step 6). The `chroma_store/` and `*.db` are excluded because they
> are runtime data, persisted in a volume instead.

## 3. Create `frontend/Dockerfile`
Path: **`frontend/Dockerfile`** (multi-stage: build the React app, then serve the static files with nginx)
```dockerfile
# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- serve stage ----
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 4. Create `frontend/.dockerignore`
Path: **`frontend/.dockerignore`**
```
node_modules/
build/
.env
```

## 5. Create `frontend/nginx.conf`
Path: **`frontend/nginx.conf`** (serves the SPA; falls back to index.html for client routing)
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 6. Create `docker-compose.yml`
Path: **`docker-compose.yml`** (at the repo root — the same folder as `backend/` and `frontend/`)
```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env          # provides HF_TOKEN, HF_LLM_MODEL, HF_EMBED_MODEL
    environment:
      # override storage paths + CORS to container-friendly values (these win over .env)
      - SQLITE_PATH=/data/vectorshift.db
      - CHROMA_DIR=/data/chroma_store
      - FRONTEND_ORIGIN=http://localhost:3000
    volumes:
      - backend_data:/data       # persist saved pipelines, run history, and vector stores

  frontend:
    build: ./frontend
    ports:
      - "3000:80"                # browser uses http://localhost:3000
    depends_on:
      - backend

volumes:
  backend_data:
```

---

## 7. Build and run
From the **repo root**:
```bash
docker compose up --build
```
- Frontend → **http://localhost:3000**
- Backend  → **http://localhost:8000** (health check: open http://localhost:8000 → `{"Ping":"Pong"}`)

Stop with `Ctrl+C`, or run detached with `docker compose up --build -d` and stop with
`docker compose down`.

---

## 8. Verify it works
1. Open **http://localhost:3000** — the pipeline builder loads.
2. Drag **Input → Output**, click **Submit** — a banner shows node/edge counts + DAG (this needs no HF
   model, so it proves frontend↔backend wiring works).
3. Build **Input → Text → LLM → Output**, click **Run** — nodes light up; the LLM node calls the HF
   API (needs a valid `HF_LLM_MODEL`). Watch the backend logs with `docker compose logs -f backend`.

---

## 9. Important notes / gotchas
- **Why `localhost:8000` works from the browser:** the frontend's API base URL is `http://localhost:8000`
  (in `frontend/src/api.js`). The browser runs on the **host**, and compose publishes the backend on the
  host's port 8000, so `localhost:8000` reaches the backend container. **Do not** change it to a
  container name — the browser can't resolve Docker service names.
- **CORS:** the backend allows the origin set by `FRONTEND_ORIGIN` (=`http://localhost:3000` here). It
  must match the URL you open the frontend at. (Already set in Step 6.)
- **Persistence:** saved pipelines, run history, and built vector stores live in the `backend_data`
  volume at `/data`. They survive `docker compose down` and restarts. To wipe them:
  `docker compose down -v`.
- **Secrets:** `HF_TOKEN` comes from `backend/.env` via `env_file` and is **not** baked into the image.
  Never commit `.env`.
- **After changing source code:** rebuild with `docker compose up --build` (plain `up` reuses the old
  image).
- **If the backend image fails to build** on `numpy`/`pandas`/`lxml`: the `build-essential` line in the
  backend Dockerfile (Step 1) already handles this; ensure it's present.
- **Ports already in use:** if 3000 or 8000 are taken on the host, change the left side of the port
  mappings in `docker-compose.yml` (e.g. `"3001:80"`), and if you change the frontend port, also update
  `FRONTEND_ORIGIN` to match (for CORS).

---

## 10. Summary of files to create
| File | Purpose |
|------|---------|
| `backend/Dockerfile` | Build + run the FastAPI backend (uvicorn, port 8000) |
| `backend/.dockerignore` | Keep secrets/data/caches out of the image |
| `frontend/Dockerfile` | Build the React app, serve static files via nginx |
| `frontend/.dockerignore` | Keep node_modules/build out of the build context |
| `frontend/nginx.conf` | SPA routing (fallback to index.html) |
| `docker-compose.yml` | Run both services together, with env + a persistence volume |
