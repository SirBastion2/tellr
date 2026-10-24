"""Arm B — full product with the rule engine as recommender (§13.2)."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from engine import rule_choice
from engine.library import Library
from eval.interview import run_product
from eval.types import ArmResult, Scenario


def _choose_rules(
    _state: dict[str, Any], _stage: str, cands: Sequence[str]
) -> tuple[str, int]:
    return rule_choice(cands), 0


def run_rules(scenario: Scenario, lib: Library) -> ArmResult:
    return run_product(scenario, lib, _choose_rules)
