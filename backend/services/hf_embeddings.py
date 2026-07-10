"""Embeddings over the Hugging Face Inference API (feature-extraction)."""
import logging

import config
from errors import EmbeddingError

log = logging.getLogger(__name__)

_client = None


def _get_client():
    """Create the HF client lazily so importing this module never needs the SDK."""
    global _client
    if _client is None:
        if not config.HF_TOKEN:
            raise EmbeddingError("HF_TOKEN is not set — put it in backend/.env")
        try:
            from huggingface_hub import InferenceClient
        except ImportError as exc:
            raise EmbeddingError("huggingface_hub not installed — run: pip install -r requirements.txt") from exc
        _client = InferenceClient(token=config.HF_TOKEN)
    return _client


def _mean_pool(vec):
    """HF may return token-level embeddings (2D) or a sentence vector (1D)."""
    if not vec:
        return []
    if isinstance(vec[0], (list, tuple)):  # 2D -> mean over tokens
        cols = len(vec[0])
        return [sum(row[i] for row in vec) / len(vec) for i in range(cols)]
    return list(vec)


def embed(texts: list[str], *, model: str | None = None) -> list[list[float]]:
    """Return one embedding vector per input text."""
    client = _get_client()
    model = model or config.HF_EMBED_MODEL
    print(f"[hf] embedding {len(texts)} text(s) -> {model} ...", flush=True)
    out: list[list[float]] = []
    for t in texts:
        try:
            raw = client.feature_extraction(t, model=model)
        except Exception as exc:  # noqa: BLE001
            raise EmbeddingError(f"Embedding failed: {exc}") from exc
        vec = raw.tolist() if hasattr(raw, "tolist") else raw
        out.append(_mean_pool(vec))
    return out


def embed_one(text: str, *, model: str | None = None) -> list[float]:
    return embed([text], model=model)[0]


if __name__ == "__main__":  # live smoke test (personal laptop)
    import sys
    v = embed_one(sys.argv[1] if len(sys.argv) > 1 else "hello world")
    print(f"dim={len(v)}  head={v[:5]}")
