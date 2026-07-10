"""Node executor registry. Each node registers with @register('nodeType')."""
from typing import Callable

Executor = Callable[[dict, dict], dict]  # execute(inputs, config) -> outputs

_REGISTRY: dict[str, Executor] = {}


def register(node_type: str):
    """Decorator: register an executor function for a node type."""
    def deco(fn: Executor) -> Executor:
        _REGISTRY[node_type] = fn
        return fn
    return deco


def get_executor(node_type: str) -> Executor | None:
    return _REGISTRY.get(node_type)


def registered_types() -> list[str]:
    return sorted(_REGISTRY.keys())
