"""Q-009: undo, outcome, and live against the real engine (A-04 A2)."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient
from tests.api.conftest import (
    assert_error_body,
    assert_session_state,
    comparable,
    load_cases,
)

from store import sqlite as store

ROOT = Path(__file__).resolve().parents[2]
T1 = json.loads((ROOT / "contract" / "fixtures" / "T1.json").read_text(encoding="utf-8"))
T2 = json.loads((ROOT / "contract" / "fixtures" / "T2.json").read_text(encoding="utf-8"))


def _post_step(client: TestClient, session_id: str | None, step: dict) -> tuple[object, str]:
    endpoint = step["endpoint"]
    body = step["request"]
    if endpoint == "POST /sessions":
        response = client.post("/sessions", json=body)
    elif endpoint.endswith("/context"):
        assert session_id is not None
        response = client.post(f"/sessions/{session_id}/context", json=body)
    elif endpoint.endswith("/answers"):
        assert session_id is not None
        response = client.post(f"/sessions/{session_id}/answers", json=body)
    else:
        raise AssertionError(f"unexpected fixture endpoint {endpoint}")
    return response, endpoint


def _replay(client: TestClient, case: dict, through: int) -> tuple[str, list[dict]]:
    session_id: str | None = None
    states: list[dict] = []
    for step in case["steps"][: through + 1]:
        response, endpoint = _post_step(client, session_id, step)
        assert response.status_code == 200, f"{endpoint}: {response.text}"
        payload = response.json()
        assert_session_state(payload)
        assert "_engine" not in payload
        session_id = payload["session_id"]
        states.append(payload)
    assert session_id is not None
    return session_id, states


def _events(client: TestClient, session_id: str) -> list[dict]:
    return store.load_events(client.app.state.db, session_id)


def test_undo_after_context_restores_open_state(client: TestClient) -> None:
    session_id, states = _replay(client, T1, through=1)
    undone = client.post(f"/sessions/{session_id}/undo")
    assert undone.status_code == 200, undone.text
    body = undone.json()
    assert_session_state(body)
    assert "_engine" not in body
    assert comparable(body) == comparable(states[0])
    kinds = [event["type"] for event in _events(client, session_id)]
    assert kinds == ["SessionOpened", "ContextAdded", "Truncated"]


def test_undo_after_opener_restores_context_state(client: TestClient) -> None:
    session_id, states = _replay(client, T1, through=2)
    undone = client.post(f"/sessions/{session_id}/undo")
    assert undone.status_code == 200, undone.text
    body = undone.json()
    assert_session_state(body)
    assert body["answers"] == 0
    assert body["stated_purpose"] is None
    assert comparable(body) == comparable(states[1])


def test_two_undos_pop_twice(client: TestClient) -> None:
    session_id, states = _replay(client, T1, through=2)
    first = client.post(f"/sessions/{session_id}/undo")
    assert first.status_code == 200, first.text
    assert comparable(first.json()) == comparable(states[1])
    second = client.post(f"/sessions/{session_id}/undo")
    assert second.status_code == 200, second.text
    assert comparable(second.json()) == comparable(states[0])
    kinds = [event["type"] for event in _events(client, session_id)]
    assert kinds.count("Truncated") == 2
    assert "ContextAdded" in kinds
    assert "AnswerRecorded" in kinds


def test_answer_after_undo_is_live(client: TestClient) -> None:
    session_id, states = _replay(client, T1, through=2)
    undone = client.post(f"/sessions/{session_id}/undo")
    assert undone.status_code == 200, undone.text
    opener = T1["steps"][2]["request"]
    again = client.post(f"/sessions/{session_id}/answers", json=opener)
    assert again.status_code == 200, again.text
    body = again.json()
    assert_session_state(body)
    assert comparable(body) == comparable(states[2])


def test_outcome_appends_closed_and_keeps_session_state(client: TestClient) -> None:
    session_id, states = _replay(client, T1, through=1)
    recorded = client.post(
        f"/sessions/{session_id}/outcome",
        json={"outcome": "proceed", "actor": "teller", "note": "ok to pay"},
    )
    assert recorded.status_code == 200, recorded.text
    body = recorded.json()
    assert_session_state(body)
    assert "_engine" not in body
    assert "outcome" not in body
    assert "actor" not in body
    assert "closed" not in body
    assert body["available_outcomes"] == ["proceed", "slow_down", "escalate", "report"]
    assert comparable(body) == comparable(states[1])
    kinds = [event["type"] for event in _events(client, session_id)]
    assert kinds[-2:] == ["OutcomeRecorded", "SessionClosed"]
    row = store.get_session(client.app.state.db, session_id)
    assert row is not None
    assert row["closed_at"]


def test_outcome_after_undo_uses_restored_fold(client: TestClient) -> None:
    session_id, states = _replay(client, T1, through=2)
    undone = client.post(f"/sessions/{session_id}/undo")
    assert undone.status_code == 200, undone.text
    recorded = client.post(
        f"/sessions/{session_id}/outcome",
        json={"outcome": "slow_down", "actor": "teller"},
    )
    assert recorded.status_code == 200, recorded.text
    body = recorded.json()
    assert_session_state(body)
    assert comparable(body) == comparable(states[1])
    blocked = client.post(
        f"/sessions/{session_id}/context",
        json={"chips": ["chip.cash_only"]},
    )
    assert blocked.status_code == 409, blocked.text
    error = blocked.json()
    assert_error_body(error)
    assert error["error"]["code"] == "session_closed"


def test_live_t2_matches_fixture_except_mode(client: TestClient) -> None:
    session_id: str | None = None
    for index, step in enumerate(T2["steps"]):
        body = dict(step["request"])
        if step["endpoint"] == "POST /sessions":
            body["mode"] = "live"
            body.pop("scenario_id", None)
            response = client.post("/sessions", json=body)
        else:
            response, _ = _post_step(client, session_id, step)
        assert response.status_code == 200, f"T2 live step {index}: {response.text}"
        payload = response.json()
        assert_session_state(payload)
        assert "_engine" not in payload
        assert payload["mode"] == "live"
        if session_id is None:
            session_id = payload["session_id"]
        expected = comparable(step["response"])
        expected["mode"] = "live"
        assert comparable(payload) == expected, f"T2 live step {index} diverged"


def test_non_fixture_prefix_still_projects(client: TestClient) -> None:
    opened = client.post("/sessions", json={"mode": "live", "amount_band": "5000_9999"})
    assert opened.status_code == 200, opened.text
    session_id = opened.json()["session_id"]
    response = client.post(
        f"/sessions/{session_id}/context",
        json={"chips": ["chip.cash_only"]},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert_session_state(body)
    assert body["mode"] == "live"
    assert body["risk"]["score"] > 0
    assert body["question"]["id"] == "q.purpose.open"
    assert "_engine" not in body


def test_contract_replay_cases_are_t1_through_t7() -> None:
    assert [case["case"] for case in load_cases()] == [f"T{n}" for n in range(1, 8)]
