"""Engine tests using fake executors (no AI). Run: cd backend && python -m pytest -v"""
from engine.executor import run_pipeline
from engine.registry import register
from schemas import EdgeIn, NodeIn


@register("t_src")
def _src(inputs, config):
    return {"value": config.get("v")}


@register("t_up")
def _up(inputs, config):
    return {"out": f"{inputs.get('value')}!"}


@register("t_cond")
def _cond(inputs, config):
    return {"true": config.get("v")} if config.get("go") else {"false": config.get("v")}


def _n(i, t, data=None):
    return NodeIn(id=i, type=t, data=data or {})


def _e(s, t, sh, th):
    return EdgeIn(source=s, target=t, sourceHandle=sh, targetHandle=th)


def test_linear_flow_propagates_values():
    nodes = [_n("a", "t_src", {"v": "hi"}), _n("b", "t_up")]
    edges = [_e("a", "b", "a-value", "b-value")]
    results, _ = run_pipeline(nodes, edges)
    assert results["a"]["status"] == "done"
    assert results["b"]["outputs"]["out"] == "hi!"


def test_condition_skips_untaken_branch():
    nodes = [_n("c", "t_cond", {"go": True, "v": "hi"}), _n("y", "t_up"), _n("z", "t_up")]
    edges = [_e("c", "y", "c-true", "y-value"), _e("c", "z", "c-false", "z-value")]
    results, _ = run_pipeline(nodes, edges)
    assert results["y"]["status"] == "done"
    assert results["z"]["status"] == "skipped"


def test_node_error_is_isolated():
    @register("t_boom")
    def _boom(inputs, config):
        raise ValueError("boom")

    results, _ = run_pipeline([_n("x", "t_boom")], [])
    assert results["x"]["status"] == "error"
    assert "boom" in results["x"]["error"]


def test_output_node_collected_as_final():
    nodes = [_n("a", "t_src", {"v": "done"}), _n("o", "customOutput", {"outputName": "result"})]
    edges = [_e("a", "o", "a-value", "o-value")]
    _, final = run_pipeline(nodes, edges)
    assert final["result"] == "done"
