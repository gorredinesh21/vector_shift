"""Lightweight local vector store — one small JSON file per document.

Deliberately NOT Chroma: Chroma downloads a default ONNX embedding model and
loads onnxruntime + telemetry on first use, which is slow and can freeze a
laptop. We embed via the HF API ourselves and store the vectors in a plain JSON
file, doing top-k cosine similarity with NumPy. Fast, light, no downloads.

One "collection" = one document = one file: <CHROMA_DIR>/<collection>.json
"""
import json
import logging
import os
import re
import uuid

import config
from services import hf_embeddings

log = logging.getLogger(__name__)


def _store_dir() -> str:
    os.makedirs(config.CHROMA_DIR, exist_ok=True)
    return config.CHROMA_DIR


def _path(collection: str) -> str:
    return os.path.join(_store_dir(), f"{collection}.json")


def chunk_text(text: str, size: int = config.CHUNK_SIZE, overlap: int = config.CHUNK_OVERLAP) -> list[str]:
    """Split text into ~`size`-char chunks with overlap, breaking on whitespace."""
    text = re.sub(r"\s+", " ", text or "").strip()
    if not text:
        return []
    chunks, start = [], 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            sp = text.rfind(" ", start, end)
            if sp > start:
                end = sp
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return [c for c in chunks if c]


def build(doc_name: str, text: str) -> tuple[str, int]:
    """Chunk + embed `text` into a NEW collection file. Returns (collection, count)."""
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("No text to index")
    collection = f"doc_{uuid.uuid4().hex[:12]}"
    print(f"[rag] building context '{doc_name}' - {len(chunks)} chunks", flush=True)
    embeds = hf_embeddings.embed(chunks)
    with open(_path(collection), "w", encoding="utf-8") as f:
        json.dump({"doc": doc_name, "chunks": chunks, "embeddings": embeds}, f)
    print(f"[rag] context '{collection}' saved ({len(chunks)} chunks)", flush=True)
    return collection, len(chunks)


def search(collection: str, query: str, k: int = config.TOP_K) -> list[str]:
    """Return the top-k most relevant chunks from a collection for `query`."""
    path = _path(collection)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Context '{collection}' not found — build it first")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    chunks = data.get("chunks", [])
    embeds = data.get("embeddings", [])
    if not chunks:
        return []

    import numpy as np  # imported lazily
    matrix = np.asarray(embeds, dtype=float)
    qvec = np.asarray(hf_embeddings.embed_one(query), dtype=float)
    # cosine similarity
    matrix_n = matrix / (np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-9)
    qvec_n = qvec / (np.linalg.norm(qvec) + 1e-9)
    sims = matrix_n @ qvec_n
    top = np.argsort(-sims)[:k]
    return [chunks[i] for i in top]


def list_collections() -> list[dict]:
    """List saved collections (for the 'select existing DB' dropdown)."""
    out = []
    for fn in os.listdir(_store_dir()):
        if fn.endswith(".json"):
            col = fn[:-5]
            try:
                with open(os.path.join(_store_dir(), fn), "r", encoding="utf-8") as f:
                    data = json.load(f)
                out.append({"collection": col, "doc": data.get("doc", ""),
                            "count": len(data.get("chunks", []))})
            except Exception:  # noqa: BLE001
                continue
    return out
