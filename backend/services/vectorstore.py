"""Chroma vector store — one collection per document (RAG backend)."""
import logging
import re
import uuid

import config
from services import hf_embeddings

log = logging.getLogger(__name__)

_client = None


def _get_client():
    """Create the Chroma client lazily so importing this module never needs chromadb."""
    global _client
    if _client is None:
        try:
            import chromadb
        except ImportError as exc:
            raise RuntimeError("chromadb not installed — run: pip install -r requirements.txt") from exc
        _client = chromadb.PersistentClient(path=config.CHROMA_DIR)
    return _client


def chunk_text(text: str, size: int = config.CHUNK_SIZE, overlap: int = config.CHUNK_OVERLAP) -> list[str]:
    """Split text into ~`size`-char chunks with overlap, breaking on whitespace."""
    text = re.sub(r"\s+", " ", text or "").strip()
    if not text:
        return []
    chunks, start = [], 0
    while start < len(text):
        end = min(start + size, len(text))
        # try not to cut mid-word
        if end < len(text):
            sp = text.rfind(" ", start, end)
            if sp > start:
                end = sp
        chunks.append(text[start:end].strip())
        start = max(end - overlap, end) if end <= start else end - overlap
        if start < 0:
            start = end
    return [c for c in chunks if c]


def build(doc_name: str, text: str) -> tuple[str, int]:
    """Chunk + embed `text` into a NEW collection. Returns (collection_name, chunk_count)."""
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("No text to index")
    collection = f"doc_{uuid.uuid4().hex[:12]}"
    print(f"[rag] building context '{doc_name}' - {len(chunks)} chunks", flush=True)
    embeds = hf_embeddings.embed(chunks)
    col = _get_client().create_collection(name=collection, metadata={"doc": doc_name})
    col.add(
        ids=[f"{collection}-{i}" for i in range(len(chunks))],
        documents=chunks,
        embeddings=embeds,
    )
    log.info("Built context '%s' (%d chunks) for %s", collection, len(chunks), doc_name)
    return collection, len(chunks)


def search(collection: str, query: str, k: int = config.TOP_K) -> list[str]:
    """Return the top-k most relevant chunks from a collection for `query`."""
    col = _get_client().get_collection(name=collection)
    qvec = hf_embeddings.embed_one(query)
    res = col.query(query_embeddings=[qvec], n_results=k)
    docs = (res.get("documents") or [[]])[0]
    return docs
