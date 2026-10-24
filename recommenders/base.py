"""Recommender protocol (architecture §7.4)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

QuestionId = str
SignalId = str


@dataclass(frozen=True)
class Recommendation:
    next_question_id: QuestionId
    signals_asserted: list[SignalId] = field(default_factory=list)


class Recommender(Protocol):
    def next(self, state: Any, candidates: list[Any]) -> Recommendation: ...
