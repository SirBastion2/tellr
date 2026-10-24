"""Recommender protocol (architecture §7.4)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from engine.rules import rule_choice


@dataclass(frozen=True)
class Recommendation:
    next_question_id: str
    signals_asserted: list[str]


class Recommender(Protocol):
    def next(self, state: Any, candidates: list[Any]) -> Recommendation: ...


class RulesRecommender:
    """§7.3 / §7.4: the rule engine as a recommender. Picks the top candidate."""

    def next(self, state: Any, candidates: list[Any]) -> Recommendation:
        ids = [item.id if hasattr(item, "id") else str(item) for item in candidates]
        return Recommendation(next_question_id=rule_choice(ids), signals_asserted=[])
