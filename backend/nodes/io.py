"""Input / Output nodes."""
from engine.registry import register


@register("customInput")
def input_node(inputs: dict, config: dict) -> dict:
    """Emit the value typed into the Input node (starting data for the pipeline)."""
    return {"value": config.get("value", "")}


@register("customOutput")
def output_node(inputs: dict, config: dict) -> dict:
    """Collect the incoming value (the engine also records it as a final result)."""
    return {"value": inputs.get("value")}
