"""Pure-logic node tests (no AI). Run: cd backend && python -m pytest -v"""
from nodes.text import text_node
from nodes.logic import merge_node
from nodes.io import input_node, output_node
from services import structured


def test_text_substitutes_variables():
    assert text_node({"name": "Sam"}, {"text": "Hi {{name}}"})["output"] == "Hi Sam"


def test_text_blank_when_missing():
    assert text_node({}, {"text": "Hi {{name}}"})["output"] == "Hi "


def test_input_emits_value():
    assert input_node({}, {"value": "start"})["value"] == "start"


def test_output_collects_value():
    assert output_node({"value": "end"}, {})["value"] == "end"


def test_merge_pick_first():
    assert merge_node({"path1": None, "path2": "b"}, {"mode": "Pick First"})["output"] == "b"


def test_merge_join_all():
    assert merge_node({"path1": "a", "path2": "b"}, {"mode": "Join All"})["output"] == ["a", "b"]


def test_structured_boolean_parsing():
    assert structured.parse_boolean("YES, definitely") is True
    assert structured.parse_boolean("no.") is False
    assert structured.parse_boolean("maybe", default=True) is True


def test_structured_bool_list_pads():
    assert structured.parse_bool_list("[true, false]", 3) == [True, False, True]
