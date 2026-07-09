from collections import defaultdict, deque
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# The React dev server (http://localhost:3000) calls this API on :8000, which is
# a cross-origin request. Without CORS the browser blocks the response.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# We only need id/source/target; Pydantic v2 ignores the extra React Flow fields.
class Node(BaseModel):
    id: str


class Edge(BaseModel):
    source: str
    target: str


class Pipeline(BaseModel):
    nodes: List[Node]
    edges: List[Edge]


def is_dag(nodes: List[Node], edges: List[Edge]) -> bool:
    """Return True iff the graph has no cycles (Kahn's algorithm / topological sort).

    Build in-degrees, repeatedly remove zero-in-degree nodes; if every node is
    removed the graph is acyclic. A self-loop or any cycle leaves nodes stuck
    with a positive in-degree, so they never get visited -> not a DAG.
    """
    ids = {n.id for n in nodes}
    adj = defaultdict(list)
    indegree = {nid: 0 for nid in ids}

    for e in edges:
        # ignore edges that reference nodes not in the pipeline
        if e.source in ids and e.target in ids:
            adj[e.source].append(e.target)
            indegree[e.target] += 1

    queue = deque(nid for nid in ids if indegree[nid] == 0)
    visited = 0
    while queue:
        node = queue.popleft()
        visited += 1
        for neighbour in adj[node]:
            indegree[neighbour] -= 1
            if indegree[neighbour] == 0:
                queue.append(neighbour)

    return visited == len(ids)


@app.get('/')
def read_root():
    return {'Ping': 'Pong'}


@app.post('/pipelines/parse')
def parse_pipeline(pipeline: Pipeline):
    return {
        'num_nodes': len(pipeline.nodes),
        'num_edges': len(pipeline.edges),
        'is_dag': is_dag(pipeline.nodes, pipeline.edges),
    }
