"""Probe which HF models your token can actually call on the Inference API.

Run on your personal laptop:  python scripts/check_models.py
Then copy the recommended model id into backend/.env (HF_LLM_MODEL).
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # import backend modules

import config  # noqa: E402
from huggingface_hub import InferenceClient  # noqa: E402

# Small, serverless-friendly instruct models (edit freely).
LLM_CANDIDATES = [
    "meta-llama/Llama-3.2-3B-Instruct",
    "microsoft/Phi-3.5-mini-instruct",
    "Qwen/Qwen2.5-7B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "google/gemma-2-2b-it",
    "HuggingFaceH4/zephyr-7b-beta",
]
EMBED_CANDIDATES = [
    "BAAI/bge-small-en-v1.5",
    "sentence-transformers/all-MiniLM-L6-v2",
]


def main() -> None:
    if not config.HF_TOKEN:
        print("No HF_TOKEN in backend/.env — add it first.")
        return
    client = InferenceClient(token=config.HF_TOKEN)

    print("=== LLMs ===")
    best = None
    for model in LLM_CANDIDATES:
        t0 = time.time()
        try:
            r = client.chat_completion(
                messages=[{"role": "user", "content": "Reply with the single word: OK"}],
                model=model, max_tokens=5,
            )
            dt = time.time() - t0
            ans = (r.choices[0].message.content or "").strip()
            print(f"  ✅ {model:45s} {dt:5.1f}s  -> {ans!r}")
            if best is None:
                best = model
        except Exception as exc:  # noqa: BLE001
            print(f"  ❌ {model:45s} {str(exc)[:70]}")

    print("\n=== Embeddings ===")
    best_embed = None
    for model in EMBED_CANDIDATES:
        try:
            v = client.feature_extraction("hello", model=model)
            dim = len(v.tolist() if hasattr(v, "tolist") else v)
            print(f"  ✅ {model:45s} dim~{dim}")
            if best_embed is None:
                best_embed = model
        except Exception as exc:  # noqa: BLE001
            print(f"  ❌ {model:45s} {str(exc)[:70]}")

    print("\n--- Recommendation ---")
    print(f"HF_LLM_MODEL={best or '(none reachable — try others)'}")
    print(f"HF_EMBED_MODEL={best_embed or '(none reachable — try others)'}")


if __name__ == "__main__":
    main()
