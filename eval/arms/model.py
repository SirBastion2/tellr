"""Arm C — full product with a model recommender at the probe stage (§13.2).

Hours 8–12 use FakeModel (no GPU). The live LocalLLM client is hours 12–15.
Eval pins temperature 0, batch size 1, no prefetch, no timeout (§13.4).
The model sees candidate IDs only — no notes, no free text (§9, §10.2).
"""

from __future__ import annotations

import os
from collections.abc import Sequence
from typing import Any
from urllib.error import URLError

from engine import rule_choice
from engine.library import Library
from eval.interview import run_product
from eval.types import ArmResult, Scenario

# HTTP timeout is disabled for eval (§13.4). LocalLLM requires a positive ms value.
_LOCAL_NO_TIMEOUT_MS = 86_400_000
_DEFAULT_SERVER = "http://127.0.0.1:8080"
_DEFAULT_MODEL_ID = "Meta-Llama-3.1-8B-Instruct-Q4_K_M"

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
        state: Any | None = None,
    ) -> str:
        del state
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


class LocalModel:
    """Arm C client wrapping A-05 LocalLLM. Timeout off (§13.4)."""

    def __init__(self, *, library: Library, client: Any | None = None) -> None:
        self.library = library
        self.calls: list[dict[str, Any]] = []
        if client is not None:
            self.client = client
            return
        from recommenders.local_llm import LocalLLM

        self.client = LocalLLM(
            server=os.environ.get("LLAMA_SERVER", _DEFAULT_SERVER),
            model_id=os.environ.get("MODEL_ID", _DEFAULT_MODEL_ID),
            timeout_ms=_LOCAL_NO_TIMEOUT_MS,
            library=library,
        )

    @classmethod
    def from_env(cls, library: Library) -> LocalModel:
        return cls(library=library)

    def warmup(self) -> bool:
        warmup = getattr(self.client, "warmup", None)
        if warmup is None:
            return True
        return bool(warmup())

    def choose(
        self,
        *,
        candidates: Sequence[str],
        temperature: float,
        batch_size: int,
        prefetch: bool,
        timeout_ms: int | None,
        state: Any | None = None,
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
        try:
            recommendation = self.client.next(state or {}, list(candidates))
            return str(recommendation.next_question_id)
        except (
            OSError,
            TimeoutError,
            URLError,
            ValueError,
            TypeError,
            KeyError,
            AttributeError,
        ):
            return ""


def _choose_model(
    state: dict[str, Any],
    stage: str,
    cands: Sequence[str],
    model: FakeModel | LocalModel,
) -> tuple[str, int]:
    if stage != "probe":
        return rule_choice(cands), 0
    raw = model.choose(
        candidates=cands,
        temperature=EVAL_TEMPERATURE,
        batch_size=EVAL_BATCH_SIZE,
        prefetch=EVAL_PREFETCH,
        timeout_ms=EVAL_TIMEOUT_MS,
        state=state,
    )
    if raw not in cands:
        return rule_choice(cands), 1
    return raw, 0


def run_model(
    scenario: Scenario,
    lib: Library,
    *,
    model: FakeModel | LocalModel | None = None,
) -> ArmResult:
    client = model if model is not None else FakeModel()

    def choose(
        state: dict[str, Any], stage: str, cands: Sequence[str]
    ) -> tuple[str, int]:
        return _choose_model(state, stage, cands, client)

    return run_product(scenario, lib, choose)
