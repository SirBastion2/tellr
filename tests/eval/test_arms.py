"""Arm A polarity, shared engine, and fake-model arm C (A-06; architecture §13.2)."""

from __future__ import annotations

from eval.arms.model import FakeModel, run_model
from eval.arms.rules import run_rules
from eval.arms.static import run_static
from eval.scenarios import parse_scenario
from tests.eval.helpers import t_scenario

from engine.library import load_library


def test_arm_a_confirmed_is_concerning_on_secrecy_not_on_cashiers_check(library_dir) -> None:
    """§13.2 polarity: a global mapping would sink every customer who accepts a check."""
    lib = load_library(library_dir)
    secrecy_yes = parse_scenario(
        {
            "id": "scn.coached.polarity_secrecy",
            "label": "secrecy confirmed only",
            "population": "coached",
            "pattern_truth": "pat.bank_impersonation",
            "stated_purpose": "purpose.moving_money",
            "context_chips": [],
            "answers": {
                "purpose": "specific",
                "counterparty_identity": "specific",
                "written_estimate": "specific",
                "receiving_account": "specific",
                "secrecy": "confirmed",
                "payment_flexibility": "confirmed",
            },
            "default": "vague",
        }
    )
    flexibility_denied = parse_scenario(
        {
            "id": "scn.coached.polarity_check",
            "label": "check denied only",
            "population": "coached",
            "pattern_truth": "pat.bank_impersonation",
            "stated_purpose": "purpose.moving_money",
            "context_chips": [],
            "answers": {
                "purpose": "specific",
                "counterparty_identity": "specific",
                "written_estimate": "specific",
                "receiving_account": "specific",
                "secrecy": "denied",
                "payment_flexibility": "denied",
            },
            "default": "vague",
        }
    )
    yes = run_static(secrecy_yes, lib)
    no_check = run_static(flexibility_denied, lib)
    assert yes.concerning_count == 1
    assert no_check.concerning_count == 1
    assert yes.raw_level == "Clear"
    assert no_check.raw_level == "Clear"


def test_arm_a_threshold_three_is_high_and_has_no_caution(library_dir) -> None:
    lib = load_library(library_dir)
    scenario = parse_scenario(t_scenario("T2"))
    result = run_static(scenario, lib)
    # T2: on_phone, cash_only, rushed + relayed + vague account + secrecy confirmed + denied check
    assert result.concerning_count >= 3
    assert result.raw_level == "High"
    assert result.score is None


def test_arm_a_does_not_count_above_threshold_chip(library_dir) -> None:
    lib = load_library(library_dir)
    scenario = parse_scenario(
        {
            "id": "scn.legitimate.threshold_chip",
            "label": "above-threshold only",
            "population": "legitimate",
            "pattern_truth": None,
            "stated_purpose": "purpose.moving_money",
            "context_chips": ["chip.above_threshold"],
            "answers": {
                "purpose": "specific",
                "counterparty_identity": "specific",
                "written_estimate": "specific",
                "receiving_account": "specific",
                "secrecy": "denied",
                "payment_flexibility": "confirmed",
            },
            "default": "vague",
        }
    )
    result = run_static(scenario, lib)
    assert result.concerning_count == 0
    assert result.raw_level == "Clear"


def test_arm_b_and_c_share_the_engine_fold(library_dir) -> None:
    lib = load_library(library_dir)
    scenario = parse_scenario(t_scenario("T1"))
    rules = run_rules(scenario, lib)
    model = run_model(scenario, lib, model=FakeModel())
    assert rules.raw_level == model.raw_level
    assert rules.score == model.score
    assert rules.asked == model.asked


def test_arm_c_fabricated_id_is_rejected_and_falls_back_to_rules(library_dir) -> None:
    lib = load_library(library_dir)
    scenario = parse_scenario(t_scenario("T2"))
    rules = run_rules(scenario, lib)
    fake = FakeModel(fabricate="q.not.in.candidates")
    model = run_model(scenario, lib, model=fake)
    assert model.validator_rejections >= 1
    assert model.raw_level == rules.raw_level
    assert model.asked == rules.asked
    assert "q.not.in.candidates" not in model.asked


def test_arm_c_config_is_eval_pinned(library_dir) -> None:
    """§13.4: batch size 1, no prefetch, no timeout, temperature 0."""
    lib = load_library(library_dir)
    scenario = parse_scenario(t_scenario("T2"))
    fake = FakeModel()
    run_model(scenario, lib, model=fake)
    assert fake.calls
    for call in fake.calls:
        assert call["temperature"] == 0
        assert call["batch_size"] == 1
        assert call["prefetch"] is False
        assert call["timeout_ms"] is None
