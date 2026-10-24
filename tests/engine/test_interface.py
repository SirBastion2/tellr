"""engine-api-v1 signatures (docs/ROSTER.md §5.1)."""

from __future__ import annotations

import inspect

import pytest

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


def test_fold_entrypoints_are_not_yet_the_real_engine() -> None:
    """A-01 freezes signatures; the fold lands in A-02 / A-04."""
    with pytest.raises(NotImplementedError):
        engine.project([], None)  # type: ignore[arg-type]
    with pytest.raises(NotImplementedError):
        engine.candidates(None, None)  # type: ignore[arg-type]
    with pytest.raises(NotImplementedError):
        engine.stop(None, None, [])  # type: ignore[arg-type]
    with pytest.raises(NotImplementedError):
        engine.rule_choice([])
    with pytest.raises(NotImplementedError):
        engine.check_command([], {}, None)  # type: ignore[arg-type]


def test_command_rejected_exposes_code() -> None:
    err = CommandRejected("purpose_required_on_opener", "opener needs a purpose")
    assert err.code == "purpose_required_on_opener"
    assert "purpose" in str(err)
