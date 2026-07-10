from collections import defaultdict, deque
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
import db
import nodes  # noqa: F401  (registers node executors)
from engine.executor import run_pipeline
from schemas import RunRequest, RunResponse, SavePipelineRequest

app = FastAPI(title="VectorShift Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


# ── Part 4: parse (node/edge count + DAG check) ─────────────────────────────
class Node(BaseModel):
    id: str


class Edge(BaseModel):
    source: str
    target: str


class Pipeline(BaseModel):
    nodes: List[Node]
    edges: List[Edge]


def is_dag(nodes_: List[Node], edges: List[Edge]) -> bool:
    ids = {n.id for n in nodes_}
    adj = defaultdict(list)
    indegree = {nid: 0 for nid in ids}
    for e in edges:
        if e.source in ids and e.target in ids:
            adj[e.source].append(e.target)
            indegree[e.target] += 1
    queue = deque(nid for nid in ids if indegree[nid] == 0)
    visited = 0
    while queue:
        node = queue.popleft()
        visited += 1
        for nb in adj[node]:
            indegree[nb] -= 1
            if indegree[nb] == 0:
                queue.append(nb)
    return visited == len(ids)


@app.get("/")
def read_root():
    return {"Ping": "Pong"}


@app.post("/pipelines/parse")
def parse_pipeline(pipeline: Pipeline):
    return {
        "num_nodes": len(pipeline.nodes),
        "num_edges": len(pipeline.edges),
        "is_dag": is_dag(pipeline.nodes, pipeline.edges),
    }


# ── Execution: run the whole pipeline ───────────────────────────────────────
@app.post("/pipelines/run", response_model=RunResponse)
def run(req: RunRequest):
    results, final = run_pipeline(req.nodes, req.edges)
    status = "error" if any(r["status"] == "error" for r in results.values()) else "done"
    db.save_run(results, status)
    return {"results": results, "final": final}


# ── Persistence: save / load pipelines, run history ─────────────────────────
@app.post("/pipelines")
def save(req: SavePipelineRequest):
    pid = db.save_pipeline(req.name, req.graph)
    return {"id": pid}


@app.get("/pipelines")
def pipelines():
    return db.list_pipelines()


@app.get("/pipelines/{pid}")
def pipeline(pid: str):
    p = db.get_pipeline(pid)
    if not p:
        raise HTTPException(404, "pipeline not found")
    return p


@app.get("/runs")
def runs():
    return db.list_runs()


@app.get("/contexts")
def contexts():
    return db.list_contexts()
