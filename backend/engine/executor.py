"""The pipeline execution engine.

Deterministic dataflow: topologically sort the graph, then run each node's
executor in order, feeding upstream outputs into downstream inputs. The
orchestrator is intentionally "dumb" and reliable; intelligence lives in nodes.
"""
import logging
from collections import defaultdict, deque

import nodes  # noqa: F401  (importing populates the registry via decorators)
from engine.handles import handle_name
from engine.registry import get_executor
from errors import NodeError

log = logging.getLogger(__name__)


def _topo_order(node_ids: list[str], edges: list) -> list[str]:
    """Kahn's algorithm. Returns node ids in dependency order (cycles dropped)."""
    adj = defaultdict(list)
    indeg = {nid: 0 for nid in node_ids}
    for e in edges:
        if e.source in indeg and e.target in indeg:
            adj[e.source].append(e.target)
            indeg[e.target] += 1
    queue = deque([n for n in node_ids if indeg[n] == 0])
    order = []
    while queue:
        n = queue.popleft()
        order.append(n)
        for m in adj[n]:
            indeg[m] -= 1
            if indeg[m] == 0:
                queue.append(m)
    # any nodes left are in a cycle — append them so they're reported, not lost
    order += [n for n in node_ids if n not in order]
    return order


def run_pipeline(nodes_in: list, edges: list) -> tuple[dict, dict]:
    """Execute the graph. Returns (results_by_node_id, final_outputs)."""
    nodes_by_id = {n.id: n for n in nodes_in}
    incoming = defaultdict(list)  # target id -> [edges]
    for e in edges:
        incoming[e.target].append(e)

    outputs: dict[str, dict] = {}   # node id -> {handle_name: value}
    results: dict[str, dict] = {}   # node id -> NodeResult-shaped dict
    final: dict = {}

    for nid in _topo_order(list(nodes_by_id), edges):
        node = nodes_by_id[nid]

        # gather inputs from upstream outputs
        node_inputs: dict = {}
        for e in incoming[nid]:
            src_out = outputs.get(e.source, {})
            key_in = handle_name(e.targetHandle, nid)
            key_src = handle_name(e.sourceHandle, e.source)
            if key_in is not None:
                node_inputs[key_in] = src_out.get(key_src)

        # skip if it has inputs wired but none produced a value (untaken branch / upstream skipped)
        has_incoming = len(incoming[nid]) > 0
        has_value = any(v is not None for v in node_inputs.values())
        if has_incoming and not has_value:
            results[nid] = {"inputs": node_inputs, "outputs": {}, "status": "skipped", "error": None}
            continue

        executor = get_executor(node.type)
        if executor is None:
            results[nid] = {"inputs": node_inputs, "outputs": {}, "status": "error",
                            "error": f"No executor registered for type '{node.type}'"}
            continue

        try:
            out = executor(node_inputs, node.data or {}) or {}
            outputs[nid] = out
            results[nid] = {"inputs": node_inputs, "outputs": out, "status": "done", "error": None}
            if node.type == "customOutput":
                label = (node.data or {}).get("outputName") or nid
                final[label] = node_inputs.get("value")
        except (NodeError, Exception) as exc:  # noqa: BLE001 - report, never crash the run
            log.exception("Node %s (%s) failed", nid, node.type)
            results[nid] = {"inputs": node_inputs, "outputs": {}, "status": "error", "error": str(exc)}

    return results, final
