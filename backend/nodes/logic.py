"""Logic nodes — Condition and Filter List use the LLM as a judge; Merge is plain."""
import json

from engine.registry import register
from services import hf_llm, structured


@register("condition")
def condition_node(inputs: dict, config: dict) -> dict:
    """LLM judges the condition against the input; routes to the True or False handle."""
    value = inputs.get("input")
    rule = config.get("condition", "")
    question = (
        f"Condition: {rule}\n\n"
        f"Input:\n{value}\n\n"
        "Is the condition TRUE for this input? Answer strictly YES or NO."
    )
    passed = hf_llm.judge_boolean(question)
    # emit the value on exactly one branch; the other stays absent -> downstream skipped
    return {"true": value} if passed else {"false": value}


def _as_list(value):
    if isinstance(value, list):
        return value
    if value is None:
        return []
    # allow newline- or comma-separated text
    text = str(value)
    parts = [p.strip() for p in text.splitlines() if p.strip()]
    if len(parts) <= 1:
        parts = [p.strip() for p in text.split(",") if p.strip()]
    return parts


@register("filterList")
def filter_list_node(inputs: dict, config: dict) -> dict:
    """LLM decides keep/drop per item (batched into one call), honoring the action."""
    items = _as_list(inputs.get("list"))
    predicate = config.get("predicate", "")
    action = (config.get("action") or "Keep").lower()
    if not items:
        return {"output": []}

    system = ("You are a filter. Given a list and a predicate, return ONLY a JSON array of "
              "booleans (one per item, same order): true if the item matches the predicate.")
    prompt = f"Predicate: {predicate}\n\nItems (JSON):\n{json.dumps(items)}"
    text = hf_llm.complete(system, prompt, max_tokens=256, temperature=0.0)
    matches = structured.parse_bool_list(text, len(items))

    if action == "drop":
        kept = [it for it, m in zip(items, matches) if not m]
    else:  # keep
        kept = [it for it, m in zip(items, matches) if m]
    return {"output": kept}


@register("merge")
def merge_node(inputs: dict, config: dict) -> dict:
    """Combine branches: Pick First = first non-null; Join All = list of non-nulls."""
    mode = config.get("mode", "Pick First")
    values = [inputs.get("path1"), inputs.get("path2")]
    present = [v for v in values if v is not None]
    if mode == "Join All":
        return {"output": present}
    return {"output": present[0] if present else None}
