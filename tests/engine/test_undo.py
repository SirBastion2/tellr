"""Undo is a pop: Truncated(to_seq) drops live events with seq > to_seq (§4)."""

from __future__ import annotations

from pathlib import Path

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


def _lib():
    return load_library(SHIPPED)


def test_answer_recorded_after_undo_is_live() -> None:
    events = [
        OPENED,
        {"type": "ContextAdded", "chips": ["chip.cash_only", "chip.on_phone"]},
        {
            "type": "AnswerRecorded",
            "question_id": "q.purpose.open",
            "chip": "specific",
            "purpose": "purpose.home_repair",
        },
        {
            "type": "AnswerRecorded",
            "question_id": "q.homerepair.contractor_name",
            "chip": "specific",
        },
        {"type": "Truncated", "to_seq": 2},
        {
            "type": "AnswerRecorded",
            "question_id": "q.homerepair.contractor_name",
            "chip": "vague",
        },
    ]
    kept = list(events)
    state = project(events, _lib())
    # T3 after Q2: cash + phone + purpose_specific + specificity_gap → 34, Caution.
    assert state["risk"]["score"] == 34
    assert state["risk"]["raw_level"] == "caution"
    assert state["answers"] == 2
    assert events == kept


def test_two_undos_pop_twice() -> None:
    events = [
        OPENED,
        {"type": "ContextAdded", "chips": ["chip.cash_only", "chip.on_phone"]},
        {
            "type": "AnswerRecorded",
            "question_id": "q.purpose.open",
            "chip": "specific",
            "purpose": "purpose.home_repair",
        },
        {
            "type": "AnswerRecorded",
            "question_id": "q.homerepair.contractor_name",
            "chip": "specific",
        },
        {"type": "Truncated", "to_seq": 2},
        {"type": "Truncated", "to_seq": 1},
    ]
    kept = list(events)
    state = project(events, _lib())
    assert state["risk"]["score"] == 26
    assert state["risk"]["raw_level"] == "caution"
    assert state["stated_purpose"] is None
    assert state["answers"] == 0
    assert events == kept


def test_undo_does_not_delete_from_the_log() -> None:
    events = [
        OPENED,
        {"type": "ContextAdded", "chips": ["chip.cash_only"]},
        {
            "type": "AnswerRecorded",
            "question_id": "q.purpose.open",
            "chip": "specific",
            "purpose": "purpose.home_repair",
        },
        {"type": "Truncated", "to_seq": 1},
    ]
    project(events, _lib())
    kinds = [event["type"] for event in events]
    assert kinds == [
        "SessionOpened",
        "ContextAdded",
        "AnswerRecorded",
        "Truncated",
    ]
    assert events[2]["chip"] == "specific"
