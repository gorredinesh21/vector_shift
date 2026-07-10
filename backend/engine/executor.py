"""The pipeline execution engine.

Deterministic dataflow: topologically sort the graph, then run each node's
executor in order, feeding upstream outputs into downstream inputs. The
orchestrator is intentionally "dumb" and reliable; intelligence lives in nodes.

`iter_run` is a generator that yields progress events (for live UI status);
`run_pipeline` consumes it and returns the final (results, final) tuple.
"""
import logging
from collections import defaultdict, deque

import nodes  # noqa: F401  (importing populates the registry via decorators)
from engine.handles import handle_name
from engine.registry import get_executor

log = logging.getLogger(__name__)


def _topo_order(node_ids: list[str], edges: list) -> list[str]:
    """Kahn's algorithm. Returns node ids in dependency order (cycles appended last)."""
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
    order += [n for n in node_ids if n not in order]
    return order


def iter_run(nodes_in: list, edges: list):
    """Run the graph, yielding progress events:

    { "event": "node_start", "id": <id> }
    { "event": "node", "id": <id>, "status": "done|skipped|error", "result": {...} }
    { "event": "complete", "results": {...}, "final": {...} }
    """
    nodes_by_id = {n.id: n for n in nodes_in}
    incoming = defaultdict(list)
    for e in edges:
        incoming[e.target].append(e)

    outputs: dict[str, dict] = {}
    results: dict[str, dict] = {}
    final: dict = {}

    order = _topo_order(list(nodes_by_id), edges)
    print(f"\n[run] ▶ START — {len(nodes_by_id)} nodes, {len(edges)} edges, order: {order}", flush=True)

    for nid in order:
        node = nodes_by_id[nid]

        node_inputs: dict = {}
        for e in incoming[nid]:
            src_out = outputs.get(e.source, {})
            key_in = handle_name(e.targetHandle, nid)
            key_src = handle_name(e.sourceHandle, e.source)
            if key_in is not None:
                node_inputs[key_in] = src_out.get(key_src)

        has_incoming = len(incoming[nid]) > 0
        has_value = any(v is not None for v in node_inputs.values())
        if has_incoming and not has_value:
            print(f"[run] · skip {nid} ({node.type}) — no input (upstream branch not taken)", flush=True)
            results[nid] = {"inputs": node_inputs, "outputs": {}, "status": "skipped", "error": None}
            yield {"event": "node", "id": nid, "status": "skipped", "result": results[nid]}
            continue

        executor = get_executor(node.type)
        if executor is None:
            print(f"[run] ✗ {nid} — no executor for type '{node.type}'", flush=True)
            results[nid] = {"inputs": node_inputs, "outputs": {}, "status": "error",
                            "error": f"No executor registered for type '{node.type}'"}
            yield {"event": "node", "id": nid, "status": "error", "result": results[nid]}
            continue

        # tell the UI this node is now working (light it up)
        print(f"[run] ▶ running {nid} ({node.type}) …", flush=True)
        yield {"event": "node_start", "id": nid}
        try:
            out = executor(node_inputs, node.data or {}) or {}
            outputs[nid] = out
            results[nid] = {"inputs": node_inputs, "outputs": out, "status": "done", "error": None}
            if node.type == "customOutput":
                label = (node.data or {}).get("outputName") or nid
                final[label] = node_inputs.get("value")
            print(f"[run] ✓ done {nid}", flush=True)
            yield {"event": "node", "id": nid, "status": "done", "result": results[nid]}
        except Exception as exc:  # noqa: BLE001 - report, never crash the run
            log.exception("Node %s (%s) failed", nid, node.type)
            print(f"[run] ✗ ERROR {nid} ({node.type}): {exc}", flush=True)
            results[nid] = {"inputs": node_inputs, "outputs": {}, "status": "error", "error": str(exc)}
            yield {"event": "node", "id": nid, "status": "error", "result": results[nid]}

    print("[run] ■ COMPLETE\n", flush=True)
    yield {"event": "complete", "results": results, "final": final}


def run_pipeline(nodes_in: list, edges: list) -> tuple[dict, dict]:
    """Execute the graph and return (results_by_node_id, final_outputs)."""
    results, final = {}, {}
    for ev in iter_run(nodes_in, edges):
        if ev["event"] == "complete":
            results, final = ev["results"], ev["final"]
    return results, final
