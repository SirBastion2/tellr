"""Test doubles for A-05. No network, no GPU."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class FakeRecommender:
    """Recommender Protocol stand-in. `next` records every call."""

    question_id: str | None = None
    delay_s: float = 0.0
    signals_asserted: list[str] = field(default_factory=list)
    queue: list[str] = field(default_factory=list)
    calls: list[tuple[Any, list[str]]] = field(default_factory=list)

    def next(self, state: Any, candidates: list[Any]) -> Any:
        from recommenders.base import Recommendation

        ids = [_qid(item) for item in candidates]
        self.calls.append((state, ids))
        if self.delay_s:
            time.sleep(self.delay_s)
        if self.queue:
            chosen = self.queue.pop(0)
        elif self.question_id is not None:
            chosen = self.question_id
        else:
            chosen = ids[0]
        return Recommendation(
            next_question_id=chosen,
            signals_asserted=list(self.signals_asserted),
        )


def _qid(item: Any) -> str:
    ident = getattr(item, "id", item)
    if isinstance(ident, dict):
        return str(ident["id"])
    return str(ident)
