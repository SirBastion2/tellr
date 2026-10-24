"""engine-api-v1 signatures (docs/ROSTER.md §5.1)."""

from __future__ import annotations

import inspect
from pathlib import Path

import engine
from engine import CommandRejected


def test_engine_api_v1_exports() -> None:
    for name in (
        "load_library",
        "project",
        "candidates",
        "stop",
        "rule_choice",
        "check_command",
        "Library",
        "CommandRejected",
    ):
        assert hasattr(engine, name), name


def test_engine_api_v1_signatures() -> None:
    assert inspect.signature(engine.load_library).parameters.keys() == {"path"}
    assert list(inspect.signature(engine.project).parameters) == ["events", "lib"]
    assert list(inspect.signature(engine.candidates).parameters) == ["state", "lib"]
    assert list(inspect.signature(engine.stop).parameters) == ["state", "lib", "cands"]
    assert list(inspect.signature(engine.rule_choice).parameters) == ["cands"]
    assert list(inspect.signature(engine.check_command).parameters) == [
        "events",
        "command",
        "lib",
    ]


def test_a04_entrypoints_are_wired() -> None:
    """A-04 implements candidates / stop / rule_choice / check_command."""
    from engine.library import load_library

    lib = load_library(Path(__file__).resolve().parents[2] / "library")
    opened = [
        {
            "type": "SessionOpened",
            "mode": "practice",
            "amount_band": "5000_9999",
            "library_version": "1.2.0",
        }
    ]
    state = engine.project(opened, lib)
    stage, cands = engine.candidates(state, lib)
    assert stage == "opener"
    assert cands == ["q.purpose.open"]
    assert engine.rule_choice(cands) == "q.purpose.open"
    assert engine.stop(state, lib, cands) is None
    engine.check_command(opened, {"type": "context", "chips": ["chip.cash_only"]}, lib)


def test_command_rejected_exposes_code() -> None:
    err = CommandRejected("purpose_required_on_opener", "opener needs a purpose")
    assert err.code == "purpose_required_on_opener"
    assert "purpose" in str(err)
