"""FakeEngine replays contract/fixtures so A2 can build the API (ROSTER §5.1)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from engine import CommandRejected, load_library
from engine.testing import FakeEngine, ReplayError

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "contract" / "fixtures"
SHIPPED = ROOT / "library"


def _cases() -> list[dict]:
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(FIXTURES.glob("T*.json"))
    ]


def _events_for(steps: list[dict], upto: int) -> list[dict]:
    events: list[dict] = []
    for step in steps[: upto + 1]:
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
            event = {
                "type": "AnswerRecorded",
                "question_id": request["question_id"],
                "chip": request["chip"],
                "purpose": request.get("purpose"),
            }
            events.append(event)
        else:
            raise AssertionError(f"unexpected fixture endpoint {endpoint}")
    return events


def test_fake_engine_replays_every_fixture_step() -> None:
    lib = load_library(SHIPPED)
    engine = FakeEngine()
    replayed = 0
    for case in _cases():
        for index, step in enumerate(case["steps"]):
            state = engine.project(_events_for(case["steps"], index), lib)
            expected = step["response"]
            assert state["answers"] == expected["answers"]
            assert state["stated_purpose"] == expected["stated_purpose"]
            assert state["risk"] == expected["risk"]
            assert state["question"] == expected["question"]
            assert state["stop"] == expected["stop"]
            assert state["talk_track"] == expected["talk_track"]
            assert state["suggested_outcome"] == expected["suggested_outcome"]
            assert state["available_outcomes"] == expected["available_outcomes"]
            replayed += 1
    assert replayed == 42


def test_fake_engine_replay_by_case_and_step() -> None:
    engine = FakeEngine()
    t1 = json.loads((FIXTURES / "T1.json").read_text(encoding="utf-8"))
    assert engine.replay("T1", 0) == t1["steps"][0]["response"]
    assert engine.replay("T1", len(t1["steps"]) - 1)["stop"] == t1["steps"][-1]["response"]["stop"]
    assert engine.cases() == ["T1", "T2", "T3", "T4", "T5", "T6", "T7"]


def test_fake_engine_candidates_and_stop_follow_replayed_state() -> None:
    lib = load_library(SHIPPED)
    engine = FakeEngine()
    t1 = json.loads((FIXTURES / "T1.json").read_text(encoding="utf-8"))
    first = engine.project(_events_for(t1["steps"], 0), lib)
    stage, cands = engine.candidates(first, lib)
    assert stage == "opener"
    assert cands == ["q.purpose.open"]
    assert engine.rule_choice(cands) == "q.purpose.open"
    assert engine.stop(first, lib, cands) is None

    last = engine.project(_events_for(t1["steps"], len(t1["steps"]) - 1), lib)
    stage, cands = engine.candidates(last, lib)
    assert last["stop"] is not None
    assert last["question"] is None
    assert cands == []
    assert engine.stop(last, lib, cands) == last["stop"]


def test_fake_engine_unknown_trace_is_not_silently_invented() -> None:
    lib = load_library(SHIPPED)
    engine = FakeEngine()
    with pytest.raises(ReplayError):
        engine.project(
            [
                {
                    "type": "SessionOpened",
                    "mode": "live",
                    "amount_band": "5000_9999",
                    "library_version": "1.2.0",
                }
            ],
            lib,
        )


def test_fake_engine_check_command_rejects_known_codes() -> None:
    lib = load_library(SHIPPED)
    engine = FakeEngine()
    opened = [
        {
            "type": "SessionOpened",
            "mode": "live",
            "amount_band": "5000_9999",
            "library_version": "1.2.0",
        }
    ]
    with pytest.raises(CommandRejected) as live_scenario:
        engine.check_command(
            opened, {"type": "open", "mode": "live", "scenario_id": "T1"}, lib
        )
    assert live_scenario.value.code == "scenario_on_live_session"

    with pytest.raises(CommandRejected) as no_purpose:
        engine.check_command(
            opened,
            {
                "type": "answer",
                "question_id": "q.purpose.open",
                "chip": "specific",
            },
            lib,
        )
    assert no_purpose.value.code == "purpose_required_on_opener"

    with pytest.raises(CommandRejected) as extra_purpose:
        engine.check_command(
            opened
            + [
                {
                    "type": "AnswerRecorded",
                    "question_id": "q.purpose.open",
                    "chip": "specific",
                    "purpose": "purpose.home_repair",
                }
            ],
            {
                "type": "answer",
                "question_id": "q.homerepair.contractor_name",
                "chip": "specific",
                "purpose": "purpose.home_repair",
            },
            lib,
        )
    assert extra_purpose.value.code == "purpose_not_allowed"

    closed = opened + [{"type": "SessionClosed"}]
    with pytest.raises(CommandRejected) as closed_err:
        engine.check_command(closed, {"type": "answer", "question_id": "q.purpose.open"}, lib)
    assert closed_err.value.code == "session_closed"
