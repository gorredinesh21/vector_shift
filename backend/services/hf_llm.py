"""LLM calls over the Hugging Face Inference API (chat completion) with retry.

Serverless models sometimes return 503 "model is loading" — we back off and retry.
"""
import logging
import time

import config
from errors import LLMError
from services import structured

log = logging.getLogger(__name__)

_client = None


def _get_client():
    """Create the HF client lazily so importing this module never needs the SDK."""
    global _client
    if _client is None:
        if not config.HF_TOKEN:
            raise LLMError("HF_TOKEN is not set — put it in backend/.env")
        try:
            from huggingface_hub import InferenceClient
        except ImportError as exc:
            raise LLMError("huggingface_hub not installed — run: pip install -r requirements.txt") from exc
        _client = InferenceClient(token=config.HF_TOKEN)
    return _client


def _with_retry(fn, *, attempts: int = 4, base_delay: float = 2.0):
    last = None
    for i in range(attempts):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001
            last = exc
            msg = str(exc).lower()
            # retry only on transient "loading"/503/timeout
            if any(k in msg for k in ("loading", "503", "timeout", "429")):
                delay = base_delay * (2 ** i)
                print(f"[hf] transient error ({str(exc)[:80]}); retry in {delay:.0f}s "
                      f"({i + 1}/{attempts})", flush=True)
                time.sleep(delay)
                continue
            break
    raise LLMError(f"LLM call failed: {last}")


def complete(system: str, prompt: str, *, model: str | None = None, max_tokens: int = 512,
             temperature: float = 0.2) -> str:
    """Return the model's reply to a system + user prompt."""
    client = _get_client()
    model = model or config.HF_LLM_MODEL
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    def _call():
        resp = client.chat_completion(
            messages=messages, model=model, max_tokens=max_tokens, temperature=temperature,
        )
        return resp.choices[0].message.content or ""

    print(f"[hf] LLM call -> {model} (prompt {len(prompt)} chars) ...", flush=True)
    text = _with_retry(_call).strip()
    print(f"[hf] LLM ok ({len(text)} chars)", flush=True)
    return text


def judge_boolean(question: str, *, model: str | None = None) -> bool:
    """Ask the model a yes/no question and parse the answer robustly."""
    system = "You are a strict evaluator. Answer with exactly one word: YES or NO."
    text = complete(system, question, model=model, max_tokens=5, temperature=0.0)
    return structured.parse_boolean(text, default=False)


if __name__ == "__main__":  # live smoke test (personal laptop)
    import sys
    q = sys.argv[1] if len(sys.argv) > 1 else "Say hello in one sentence."
    print(complete("You are helpful.", q))
