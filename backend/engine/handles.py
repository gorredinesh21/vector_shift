"""Handle-id helpers so frontend and backend agree on input/output keys.

React Flow handle ids look like `${nodeId}-${handleName}` (e.g. "llm-1-response").
Executors work with the bare handle name (e.g. "response").
"""


def handle_name(full_id: str | None, node_id: str) -> str | None:
    """Strip the `${nodeId}-` prefix from a handle id, returning the bare name."""
    if not full_id:
        return None
    prefix = f"{node_id}-"
    return full_id[len(prefix):] if full_id.startswith(prefix) else full_id
