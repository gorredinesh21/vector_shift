"""Force + tolerantly parse structured output from LLMs.

Many open models don't reliably return clean JSON/booleans, so we (1) prompt
strictly and (2) parse defensively with sensible fallbacks. Never trust the model
to be well-formed.
"""
import json
import re

_TRUE = {"yes", "true", "1", "y", "correct", "pass", "keep"}
_FALSE = {"no", "false", "0", "n", "incorrect", "fail", "drop"}


def parse_boolean(text: str, default: bool = False) -> bool:
    """Interpret a model's answer as True/False, tolerantly."""
    if not text:
        return default
    t = text.strip().lower()
    # first token wins (e.g. "YES, because…")
    first = re.split(r"[^a-z0-9]+", t, maxsplit=1)[0] if t else ""
    if first in _TRUE:
        return True
    if first in _FALSE:
        return False
    # fallback: scan anywhere
    if any(w in t for w in _TRUE):
        return True
    if any(w in t for w in _FALSE):
        return False
    return default


def extract_json(text: str, default):
    """Pull the first JSON object/array out of a model response; else `default`."""
    if not text:
        return default
    # strip code fences
    text = re.sub(r"```(?:json)?", "", text).strip()
    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if not match:
        return default
    try:
        return json.loads(match.group(1))
    except (ValueError, TypeError):
        return default


def parse_bool_list(text: str, n: int) -> list[bool]:
    """Parse a JSON array of booleans of length n; pad/truncate; default True."""
    data = extract_json(text, default=[])
    out: list[bool] = []
    if isinstance(data, list):
        for item in data:
            if isinstance(item, bool):
                out.append(item)
            elif isinstance(item, str):
                out.append(parse_boolean(item, default=True))
            else:
                out.append(True)
    # normalize length
    out = out[:n] + [True] * max(0, n - len(out))
    return out


def parse_str_list(text: str) -> list[str]:
    """Parse a JSON array of strings; else fall back to non-empty lines."""
    data = extract_json(text, default=None)
    if isinstance(data, list):
        return [str(x).strip() for x in data if str(x).strip()]
    return [ln.strip("-* \t") for ln in (text or "").splitlines() if ln.strip()]
