"""Tests for the /pipelines/parse endpoint (deliverables N7-N10).

Run:  cd backend && python -m pytest -v
"""
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def parse(node_ids, edge_pairs):
    nodes = [{"id": n} for n in node_ids]
    edges = [{"source": s, "target": t} for s, t in edge_pairs]
    resp = client.post("/pipelines/parse", json={"nodes": nodes, "edges": edges})
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── N7: num_nodes ──────────────────────────────────────────────────────────
def test_num_nodes_counts_nodes():
    assert parse(["a", "b", "c"], [])["num_nodes"] == 3
    assert parse([], [])["num_nodes"] == 0


# ── N8: num_edges ──────────────────────────────────────────────────────────
def test_num_edges_counts_edges():
    assert parse(["a", "b"], [("a", "b")])["num_edges"] == 1
    assert parse(["a", "b", "c"], [("a", "b"), ("b", "c")])["num_edges"] == 2


# ── N9: is_dag (correct cycle detection) ───────────────────────────────────
def test_is_dag_true_for_linear():
    assert parse(["a", "b", "c"], [("a", "b"), ("b", "c")])["is_dag"] is True


def test_is_dag_true_for_diamond():
    assert parse(["a", "b", "c", "d"],
                 [("a", "b"), ("a", "c"), ("b", "d"), ("c", "d")])["is_dag"] is True


def test_is_dag_true_for_disconnected():
    assert parse(["a", "b", "c"], [("a", "b")])["is_dag"] is True


def test_is_dag_true_for_empty():
    assert parse([], [])["is_dag"] is True


def test_is_dag_false_for_three_node_cycle():
    assert parse(["a", "b", "c"], [("a", "b"), ("b", "c"), ("c", "a")])["is_dag"] is False


def test_is_dag_false_for_two_node_cycle():
    assert parse(["a", "b"], [("a", "b"), ("b", "a")])["is_dag"] is False


def test_is_dag_false_for_self_loop():
    assert parse(["a"], [("a", "a")])["is_dag"] is False


def test_is_dag_false_when_cycle_hidden_in_larger_graph():
    # a->b->c is fine, but d<->e is a cycle -> whole graph is not a DAG
    assert parse(["a", "b", "c", "d", "e"],
                 [("a", "b"), ("b", "c"), ("d", "e"), ("e", "d")])["is_dag"] is False


# ── N10: exact response format + types ─────────────────────────────────────
def test_response_has_exact_keys():
    body = parse(["a", "b"], [("a", "b")])
    assert set(body.keys()) == {"num_nodes", "num_edges", "is_dag"}


def test_response_types_are_int_int_bool():
    body = parse(["a", "b"], [("a", "b")])
    assert type(body["num_nodes"]) is int
    assert type(body["num_edges"]) is int
    assert type(body["is_dag"]) is bool


def test_ignores_extra_reactflow_fields():
    # real React Flow payloads carry type/position/data on nodes and handles on edges
    nodes = [
        {"id": "a", "type": "llm", "position": {"x": 0, "y": 0}, "data": {"model": "gpt-4"}},
        {"id": "b", "type": "customOutput", "position": {"x": 200, "y": 0}, "data": {}},
    ]
    edges = [{"source": "a", "target": "b", "sourceHandle": "a-out",
              "targetHandle": "b-in", "animated": True, "type": "smoothstep"}]
    resp = client.post("/pipelines/parse", json={"nodes": nodes, "edges": edges})
    assert resp.status_code == 200
    assert resp.json() == {"num_nodes": 2, "num_edges": 1, "is_dag": True}
