"""SQLite persistence: saved pipelines, run history, and the context registry."""
import json
import sqlite3
import time
import uuid
from contextlib import contextmanager

import config

_SCHEMA = """
CREATE TABLE IF NOT EXISTS pipelines (
    id TEXT PRIMARY KEY, name TEXT, graph_json TEXT,
    created_at REAL, updated_at REAL
);
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY, pipeline_id TEXT, results_json TEXT,
    status TEXT, created_at REAL
);
CREATE TABLE IF NOT EXISTS contexts (
    id TEXT PRIMARY KEY, doc_name TEXT, collection TEXT,
    chunk_size INTEGER, count INTEGER, created_at REAL
);
"""


@contextmanager
def _conn():
    con = sqlite3.connect(config.SQLITE_PATH)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init_db() -> None:
    with _conn() as con:
        con.executescript(_SCHEMA)


# ── pipelines ──────────────────────────────────────────────────────────────
def save_pipeline(name: str, graph: dict) -> str:
    pid = str(uuid.uuid4())
    now = time.time()
    with _conn() as con:
        con.execute(
            "INSERT INTO pipelines(id,name,graph_json,created_at,updated_at) VALUES(?,?,?,?,?)",
            (pid, name, json.dumps(graph), now, now),
        )
    return pid


def get_pipeline(pid: str) -> dict | None:
    with _conn() as con:
        row = con.execute("SELECT * FROM pipelines WHERE id=?", (pid,)).fetchone()
    if not row:
        return None
    return {"id": row["id"], "name": row["name"], "graph": json.loads(row["graph_json"])}


def list_pipelines() -> list[dict]:
    with _conn() as con:
        rows = con.execute("SELECT id,name,updated_at FROM pipelines ORDER BY updated_at DESC").fetchall()
    return [dict(r) for r in rows]


# ── runs ───────────────────────────────────────────────────────────────────
def save_run(results: dict, status: str, pipeline_id: str | None = None) -> str:
    rid = str(uuid.uuid4())
    with _conn() as con:
        con.execute(
            "INSERT INTO runs(id,pipeline_id,results_json,status,created_at) VALUES(?,?,?,?,?)",
            (rid, pipeline_id, json.dumps(results), status, time.time()),
        )
    return rid


def list_runs(limit: int = 50) -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            "SELECT id,pipeline_id,status,created_at FROM runs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


# ── contexts (which Chroma collection belongs to which doc) ──────────────────
def register_context(doc_name: str, collection: str, chunk_size: int, count: int) -> str:
    cid = str(uuid.uuid4())
    with _conn() as con:
        con.execute(
            "INSERT INTO contexts(id,doc_name,collection,chunk_size,count,created_at) VALUES(?,?,?,?,?,?)",
            (cid, doc_name, collection, chunk_size, count, time.time()),
        )
    return cid


def list_contexts() -> list[dict]:
    with _conn() as con:
        rows = con.execute("SELECT * FROM contexts ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]
