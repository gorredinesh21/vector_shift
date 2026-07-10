"""Text node — substitute {{ variables }} with wired-in inputs."""
import re

from engine.registry import register

_VAR = re.compile(r"\{\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}\}")


@register("text")
def text_node(inputs: dict, config: dict) -> dict:
    """Render the template, replacing each {{var}} with inputs[var] (blank if missing)."""
    template = config.get("text", "")

    def repl(m: re.Match) -> str:
        name = m.group(1)
        val = inputs.get(name)
        return "" if val is None else str(val)

    return {"output": _VAR.sub(repl, template)}
