"""Shared fixtures for A-05 recommender tests."""

from __future__ import annotations

import json
import time
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import pytest

from engine.library import Library, load_library

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "contract" / "fixtures"
NOTE_CANARY = "NOTE_CANARY_do_not_send_age_72_appearance_tattoo_named_Pat"


class FakeRecommender:
    """Test double for architecture §7.4. Sleeps and/or returns a planted ID."""

    def __init__(
        self,
        question_id: str,
        *,
        delay_s: float = 0.0,
        signals_asserted: Sequence[str] = (),
    ) -> None:
        self.question_id = question_id
        self.delay_s = delay_s
        self.signals_asserted = list(signals_asserted)
        self.calls: list[tuple[Any, list[str]]] = []

    def next(self, state: Any, candidates: Sequence[Any]) -> Any:
        from recommenders.base import Recommendation

        ids = [
            item.id if hasattr(item, "id") else str(item) for item in candidates
        ]
        self.calls.append((state, ids))
        if self.delay_s:
            time.sleep(self.delay_s)
        return Recommendation(
            next_question_id=self.question_id,
            signals_asserted=list(self.signals_asserted),
        )


@pytest.fixture
def library() -> Library:
    return load_library(ROOT / "library")


def load_cases() -> list[dict]:
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(FIXTURES.glob("T*.json"))
    ]


def events_from_steps(steps: list[dict], *, inject_note: str | None = None) -> list[dict]:
    """Rebuild a fixture prefix as events. Notes are injected only when asked."""
    events: list[dict] = []
    for step in steps:
        endpoint = step["endpoint"]
        request = step["request"]
        if endpoint == "POST /sessions":
            events.append(
                {
                    "type": "SessionOpened",
                    "mode": request["mode"],
                    "amount_band": request["amount_band"],
                    "library_version": "1.2.0",
                }
            )
        elif endpoint.endswith("/context"):
            events.append({"type": "ContextAdded", "chips": list(request["chips"])})
        elif endpoint.endswith("/answers"):
            events.append(
                {
                    "type": "AnswerRecorded",
                    "question_id": request["question_id"],
                    "chip": request["chip"],
                    "purpose": request.get("purpose"),
                    "note": inject_note,
                }
            )
        else:
            raise AssertionError(f"unexpected fixture endpoint {endpoint}")
    return events


def t2_steps() -> list[dict]:
    return json.loads((FIXTURES / "T2.json").read_text(encoding="utf-8"))["steps"]
