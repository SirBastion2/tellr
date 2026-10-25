"""CHANGE-005 (b): ContextAdded.source folds as teller when absent; score ignores it."""

from __future__ import annotations

from pathlib import Path

from engine import candidates, project
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


def _context(*chips: str, source: str | None = None) -> dict:
    event: dict = {"type": "ContextAdded", "chips": list(chips)}
    if source is not None:
        event["source"] = source
    return event


def test_absent_source_folds_as_teller() -> None:
    state = project([OPENED, _context("chip.cash_only", "chip.on_phone")], _lib())
    assert state["context_chips"] == [
        {"id": "chip.cash_only", "source": "teller"},
        {"id": "chip.on_phone", "source": "teller"},
    ]


def test_explicit_sources_are_echoed() -> None:
    state = project(
        [
            OPENED,
            _context("chip.cash_only", source="observed"),
            _context("chip.on_phone", source="teller"),
        ],
        _lib(),
    )
    assert state["context_chips"] == [
        {"id": "chip.cash_only", "source": "observed"},
        {"id": "chip.on_phone", "source": "teller"},
    ]


def test_unknown_or_empty_source_folds_as_teller() -> None:
    state = project(
        [
            OPENED,
            _context("chip.cash_only", source="model"),
            _context("chip.on_phone", source=""),
        ],
        _lib(),
    )
    assert state["context_chips"] == [
        {"id": "chip.cash_only", "source": "teller"},
        {"id": "chip.on_phone", "source": "teller"},
    ]


def test_undo_drops_undone_context_chips() -> None:
    events = [
        OPENED,
        _context("chip.cash_only", source="observed"),
        _context("chip.on_phone", source="teller"),
        {"type": "Truncated", "to_seq": 1},
    ]
    state = project(events, _lib())
    assert state["context_chips"] == [
        {"id": "chip.cash_only", "source": "observed"},
    ]
    assert "chip.on_phone" not in {chip["id"] for chip in state["context_chips"]}


def test_undo_of_all_context_omits_context_chips() -> None:
    state = project(
        [
            OPENED,
            _context("chip.cash_only", source="observed"),
            {"type": "Truncated", "to_seq": 0},
        ],
        _lib(),
    )
    assert state.get("context_chips") in (None, [])


def test_source_does_not_move_score_reasons_or_eligibility() -> None:
    lib = _lib()
    chips = ("chip.cash_only", "chip.on_phone", "chip.rushed")
    observed = project([OPENED, _context(*chips, source="observed")], lib)
    teller = project([OPENED, _context(*chips, source="teller")], lib)
    absent = project([OPENED, _context(*chips)], lib)

    assert observed["risk"]["score"] == teller["risk"]["score"] == absent["risk"]["score"]
    assert observed["risk"]["reasons"] == teller["risk"]["reasons"] == absent["risk"]["reasons"]
    assert observed["risk"]["level"] == teller["risk"]["level"] == absent["risk"]["level"]
    assert candidates(observed, lib) == candidates(teller, lib) == candidates(absent, lib)
    assert observed["question"] == teller["question"] == absent["question"]
    assert {chip["source"] for chip in observed["context_chips"]} == {"observed"}
    assert {chip["source"] for chip in teller["context_chips"]} == {"teller"}
    assert {chip["source"] for chip in absent["context_chips"]} == {"teller"}
