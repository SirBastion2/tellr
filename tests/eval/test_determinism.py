"""The same scenario run twice gives identical results (A-06; architecture §13.4)."""

from __future__ import annotations

from eval.arms.model import FakeModel, run_model
from eval.arms.rules import run_rules
from eval.arms.static import run_static
from eval.scenarios import parse_scenario
from engine.library import load_library

from tests.eval.helpers import t_scenario


def _library(library_dir):
    return load_library(library_dir)


def test_arm_a_same_scenario_twice_is_identical(library_dir) -> None:
    lib = _library(library_dir)
    scenario = parse_scenario(t_scenario("T2"))
    first = run_static(scenario, lib)
    second = run_static(scenario, lib)
    assert first == second


def test_arm_b_same_scenario_twice_is_identical(library_dir) -> None:
    lib = _library(library_dir)
    scenario = parse_scenario(t_scenario("T3"))
    first = run_rules(scenario, lib)
    second = run_rules(scenario, lib)
    assert first == second


def test_arm_c_fake_model_same_scenario_twice_is_identical(library_dir) -> None:
    lib = _library(library_dir)
    scenario = parse_scenario(t_scenario("T2"))
    model = FakeModel()
    first = run_model(scenario, lib, model=model)
    second = run_model(scenario, lib, model=model)
    assert first == second
    assert first.validator_rejections == 0


def test_arm_c_does_not_send_free_text_to_the_model(library_dir) -> None:
    lib = _library(library_dir)
    scenario = parse_scenario(t_scenario("T2"))
    model = FakeModel()
    run_model(scenario, lib, model=model)
    for call in model.calls:
        assert "note" not in call
        assert "notes" not in call
        assert "text" not in call
        blob = " ".join(str(value) for value in call.values())
        assert "teller" not in blob.lower()
