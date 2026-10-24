"""J-01 step 1: committed practice replay logs parse and replay on the live API path."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from tests.api.conftest import assert_session_state, comparable

from api.main import create_app
from api.replay import LOG_NAMES, REPLAY_DIR, parse_log, replay_steps

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize("name", LOG_NAMES)
def test_replay_log_parses_and_replays_live_path(name: str, tmp_path: Path) -> None:
    log = parse_log(REPLAY_DIR / name)
    assert log["mode"] == "practice"
    assert log["gpu"] is False
    assert "heldout" not in str(log["scenario_id"])
    assert (ROOT / "eval" / "scenarios" / "heldout") not in Path(log.get("script", "")).parents
    assert log["steps"], f"{name} has no web --replay steps"
    assert log["events"], f"{name} has no §14.2 event log"

    app = create_app(db_path=tmp_path / "live.sqlite", recommender="fake")
    with TestClient(app) as client:
        states = replay_steps(client, log)
    assert len(states) == len(log["steps"])
    for index, (got, step) in enumerate(zip(states, log["steps"], strict=True)):
        assert_session_state(got)
        assert comparable(got) == comparable(step["response"]), (
            f"{name} step {index} {step['endpoint']} diverged from the recorded live run"
        )


def test_replay_logs_are_one_coached_and_one_legitimate() -> None:
    populations = {
        parse_log(REPLAY_DIR / name)["population"] for name in LOG_NAMES
    }
    assert populations == {"coached", "legitimate"}


@pytest.mark.parametrize("name", LOG_NAMES)
def test_event_log_replays_through_live_get(name: str, tmp_path: Path) -> None:
    from api.replay import load_into_store

    log = parse_log(REPLAY_DIR / name)
    app = create_app(db_path=tmp_path / "events.sqlite", recommender="fake")
    load_into_store(app.state.db, log)
    session_id = log["session"]["session_id"]
    with TestClient(app) as client:
        fetched = client.get(f"/sessions/{session_id}")
    assert fetched.status_code == 200, fetched.text
    body = fetched.json()
    assert_session_state(body)
    last = log["steps"][-1]["response"]
    assert comparable(body) == comparable(last)
    assert body["session_id"] == session_id
