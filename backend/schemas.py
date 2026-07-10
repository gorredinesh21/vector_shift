"""Request/response models for the API boundary."""
from typing import Optional

from pydantic import BaseModel


class NodeIn(BaseModel):
    id: str
    type: str
    data: dict = {}  # field values set in the UI (the node's config)


class EdgeIn(BaseModel):
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class RunRequest(BaseModel):
    nodes: list[NodeIn]
    edges: list[EdgeIn]


class NodeResult(BaseModel):
    inputs: dict = {}
    outputs: dict = {}
    status: str = "done"  # "done" | "skipped" | "error"
    error: Optional[str] = None


class RunResponse(BaseModel):
    results: dict[str, NodeResult]  # keyed by node id
    final: dict  # Output-node values


class SavePipelineRequest(BaseModel):
    name: str
    graph: dict  # { nodes, edges } as sent by React Flow
