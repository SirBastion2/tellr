"""Arm C — full product with a model recommender at the probe stage (§13.2).

Hours 8–12 use FakeModel (no GPU). The live LocalLLM client is hours 12–15.
Eval pins temperature 0, batch size 1, no prefetch, no timeout (§13.4).
The model sees candidate IDs only — no notes, no free text (§9, §10.2).
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from engine import rule_choice
from engine.library import Library
from eval.interview import run_product
from eval.types import ArmResult, Scenario

EVAL_TEMPERATURE = 0
EVAL_BATCH_SIZE = 1
EVAL_PREFETCH = False
EVAL_TIMEOUT_MS = None


class FakeModel:
    """Deterministic stand-in: first candidate, or a fabricated ID for tests."""

    def __init__(self, fabricate: str | None = None) -> None:
        self.fabricate = fabricate
        self.calls: list[dict[str, Any]] = []

    def choose(
        self,
        *,
        candidates: Sequence[str],
        temperature: float,
        batch_size: int,
        prefetch: bool,
        timeout_ms: int | None,
    ) -> str:
        self.calls.append(
            {
                "candidates": list(candidates),
                "temperature": temperature,
                "batch_size": batch_size,
                "prefetch": prefetch,
                "timeout_ms": timeout_ms,
            }
        )
        if self.fabricate is not None:
            return self.fabricate
        return candidates[0]


def _choose_model(
    state: dict[str, Any],
    stage: str,
    cands: Sequence[str],
    model: FakeModel,
) -> tuple[str, int]:
    del state
    if stage != "probe":
        return rule_choice(cands), 0
    raw = model.choose(
        candidates=cands,
        temperature=EVAL_TEMPERATURE,
        batch_size=EVAL_BATCH_SIZE,
        prefetch=EVAL_PREFETCH,
        timeout_ms=EVAL_TIMEOUT_MS,
    )
    if raw not in cands:
        return rule_choice(cands), 1
    return raw, 0


def run_model(
    scenario: Scenario, lib: Library, *, model: FakeModel | None = None
) -> ArmResult:
    client = model if model is not None else FakeModel()

    def choose(
        state: dict[str, Any], stage: str, cands: Sequence[str]
    ) -> tuple[str, int]:
        return _choose_model(state, stage, cands, client)

    return run_product(scenario, lib, choose)
