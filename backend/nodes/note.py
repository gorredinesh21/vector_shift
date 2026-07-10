"""Note node — a canvas annotation; does nothing at run time."""
from engine.registry import register


@register("note")
def note_node(inputs: dict, config: dict) -> dict:
    return {}
