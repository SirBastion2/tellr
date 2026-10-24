"""Deterministic stand-in for LocalLLM. No GPU, no network."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from recommenders.base import Recommendation


class FakeRecommender:
    """First candidate, same pick as rule_choice. Used on CPU-only VMs."""

    MODEL_ID = "fake-deterministic"

    def next(self, state: Any, candidates: Sequence[Any]) -> Recommendation:
        del state
        if not candidates:
            raise ValueError("FakeRecommender requires at least one candidate")
        first = candidates[0]
        question_id = first.id if hasattr(first, "id") else str(first)
        return Recommendation(next_question_id=str(question_id), signals_asserted=[])
