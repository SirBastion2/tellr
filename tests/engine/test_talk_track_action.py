"""CHANGE-007: the engine copies talk_track.action from the stage track."""

from __future__ import annotations

import json
from pathlib import Path

from engine import load_library, project
from engine.library import export_library

ROOT = Path(__file__).resolve().parents[2]
SHIPPED = ROOT / "library"
FIXTURES = ROOT / "contract" / "fixtures"

ACTIONS = {
    "tt.proceed": "Complete the withdrawal.",
    "tt.slow_down": "Pause the cash. Verify the story, and offer a cashier's check.",
    "tt.escalate": "Ask the customer to step aside and get a manager.",
    "tt.bank_impersonation": "Pause the move and tell them the bank does not move money to keep it safe.",
    "tt.home_repair": "Verify the contractor and the written estimate before releasing cash.",
}

PROCEED_LINE = "Thanks for walking me through that."
ESCALATE_LINE = "I'd like my manager to take a quick look. It's routine for larger cash withdrawals."
BANK_LINE = "Your bank will never ask you to move money to keep it safe."


def _open(chips: list[str] | None = None) -> list[dict]:
    events: list[dict] = [
        {
            "type": "SessionOpened",
            "mode": "live",
            "amount_band": "5000_9999",
            "library_version": "1.2.0",
        }
    ]
    if chips:
        events.append({"type": "ContextAdded", "chips": chips})
    return events


def test_each_library_track_has_its_draft_action() -> None:
    lib = load_library(SHIPPED)
    by_id = {track.id: track for track in lib.talk_tracks}
    assert set(by_id) == set(ACTIONS)
    for track_id, action in ACTIONS.items():
        assert by_id[track_id].action == action
        assert by_id[track_id].lines
    exported = {row["id"]: row for row in export_library(lib)["talk_tracks"]}
    for track_id, action in ACTIONS.items():
        assert exported[track_id]["action"] == action
        assert exported[track_id]["lines"] == by_id[track_id].lines


def test_clear_step_copies_proceed_action_and_leaves_the_script() -> None:
    lib = load_library(SHIPPED)
    state = project(_open(), lib)
    track = state["talk_track"]
    assert track["stage"] == "tt.proceed"
    assert track["pattern"] is None
    assert track["lines"] == [PROCEED_LINE]
    assert track["action"] == ACTIONS["tt.proceed"]
    assert state["question"]["text"] == "What's the money for today?"
    assert track["action"] != state["question"]["text"]


def test_caution_step_copies_the_slow_down_action() -> None:
    lib = load_library(SHIPPED)
    state = project(
        _open(["chip.on_phone", "chip.someone_directing", "chip.cash_only"]),
        lib,
    )
    track = state["talk_track"]
    assert state["risk"]["level"] == "caution"
    assert track["stage"] == "tt.slow_down"
    assert track["action"] == ACTIONS["tt.slow_down"]
    assert track["lines"][0].startswith("We see a lot of calls like this lately.")
    assert "action" not in track["lines"]


def test_high_pattern_step_keeps_the_stage_action_and_appends_pattern_lines() -> None:
    lib = load_library(SHIPPED)
    t2 = json.loads((FIXTURES / "T2.json").read_text(encoding="utf-8"))
    events: list[dict] = []
    for step in t2["steps"]:
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
                }
            )
    state = project(events, lib)
    track = state["talk_track"]
    assert state["risk"]["level"] == "high"
    assert track["stage"] == "tt.escalate"
    assert track["pattern"] == "tt.bank_impersonation"
    assert track["lines"][0] == ESCALATE_LINE
    assert BANK_LINE in track["lines"]
    assert track["action"] == ACTIONS["tt.escalate"]
    assert track["action"] != ACTIONS["tt.bank_impersonation"]


def test_missing_action_is_omitted() -> None:
    lib = load_library(SHIPPED)
    for track in lib.talk_tracks:
        track.action = None
    state = project(_open(), lib)
    assert "action" not in state["talk_track"]
    assert state["talk_track"]["lines"] == [PROCEED_LINE]
    exported = export_library(lib)["talk_tracks"]
    assert all("action" not in row for row in exported)
