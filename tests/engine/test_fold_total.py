"""The fold is total: it never raises on a readable log (§4)."""

from __future__ import annotations

from pathlib import Path

import pytest

from engine import project
from engine.library import load_library

ROOT = Path(__file__).resolve().parents[2]
SHIPPED = ROOT / "library"

OPENED = {
    "type": "SessionOpened",
    "mode": "practice",
    "amount_band": "5000_9999",
    "library_version": "1.2.0",
}


@pytest.fixture
def lib():
    return load_library(SHIPPED)


def test_empty_log_does_not_raise(lib) -> None:
    state = project([], lib)
    assert state["risk"]["score"] == 0
    assert state["risk"]["raw_level"] == "clear"


def test_unknown_event_kind_is_logged_and_skipped(lib, caplog) -> None:
    events = [
        OPENED,
        {"type": "NotARealKind", "payload": "ignore me"},
        {"type": "ContextAdded", "chips": ["chip.cash_only"]},
    ]
    with caplog.at_level("WARNING"):
        state = project(events, lib)
    assert state["risk"]["score"] == 12
    assert "NotARealKind" in caplog.text


def test_missing_fields_and_non_mappings_do_not_raise(lib) -> None:
    events = [
        OPENED,
        {"type": "Truncated"},
        {"type": "ContextAdded"},
        {"type": "AnswerRecorded"},
        {"type": "ModelSignal"},
        "not-an-event",
        17,
        None,
        {"type": "QuestionAsked", "question_id": "q.purpose.open"},
        {"type": "RecommendationIssued"},
        {"type": "ValidationRejected"},
        {"type": "ManagerRequested"},
        {"type": "OutcomeRecorded", "outcome": "Proceed", "actor": "teller"},
        {"type": "SessionClosed"},
    ]
    state = project(events, lib)
    assert isinstance(state["risk"]["score"], int)


def test_unknown_chip_and_unknown_question_do_not_raise(lib) -> None:
    events = [
        OPENED,
        {"type": "ContextAdded", "chips": ["chip.does_not_exist", "chip.above_threshold"]},
        {
            "type": "AnswerRecorded",
            "question_id": "q.not_in_library",
            "chip": "specific",
        },
    ]
    state = project(events, lib)
    assert state["risk"]["score"] == 0
