"""LLM node — calls the Hugging Face model with a system + user prompt."""
from engine.registry import register
from services import hf_llm


@register("llm")
def llm_node(inputs: dict, config: dict) -> dict:
    """Run the LLM. `system` and `prompt` come from wired inputs (fallback to config)."""
    system = inputs.get("system") or config.get("system") or "You are a helpful assistant."
    prompt = inputs.get("prompt") or config.get("prompt") or ""
    if not prompt:
        return {"response": ""}
    response = hf_llm.complete(str(system), str(prompt))
    return {"response": response}
