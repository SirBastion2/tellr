"""CHANGE-005 (c): read-only GET /sessions/{id}/activity (contract/activity.schema.json)."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient
from tests.api.conftest import assert_activity, assert_session_state

from store import sqlite as store

ROOT = Path(__file__).resolve().parents[2]
T1 = json.loads((ROOT / "contract" / "fixtures" / "T1.json").read_text(encoding="utf-8"))
UNKNOWN = "00000000-0000-0000-0000-000000000000"
NOTE_CANARY = "teller note must never appear on activity"


def _open(client: TestClient) -> tuple[str, str]:
    body = T1["steps"][0]["request"]
    response = client.post("/sessions", json=body)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert_session_state(payload)
    return payload["session_id"], body["amount_band"]


def _events(client: TestClient, session_id: str) -> list[dict]:
    return store.load_events(client.app.state.db, session_id)


def test_unknown_session_is_404_with_existing_error_shape(client: TestClient) -> None:
    existing = client.get(f"/sessions/{UNKNOWN}")
    response = client.get(f"/sessions/{UNKNOWN}/activity")
    assert existing.status_code == 404
    assert response.status_code == 404
    assert response.json() == existing.json()
    assert response.json() == {"detail": "session not found"}


def test_open_session_has_empty_rows(client: TestClient) -> None:
    session_id, _amount = _open(client)
    response = client.get(f"/sessions/{session_id}/activity")
    assert response.status_code == 200, response.text
    body = response.json()
    assert_activity(body)
    assert body == {"session_id": session_id, "rows": []}


def test_activity_response_validates_against_contract_schema(client: TestClient) -> None:
    session_id, amount_band = _open(client)
    chips = ["chip.cash_only", "chip.on_phone"]
    posted = client.post(f"/sessions/{session_id}/context", json={"chips": chips})
    assert posted.status_code == 200, posted.text
    response = client.get(f"/sessions/{session_id}/activity")
    assert response.status_code == 200, response.text
    body = response.json()
    assert_activity(body)
    assert body["session_id"] == session_id
    assert len(body["rows"]) == 2
    events = _events(client, session_id)
    context = next(event for event in events if event["type"] == "ContextAdded")
    assert body["rows"] == [
        {
            "ts": context["ts"],
            "channel": "chip.cash_only",
            "amount_band": amount_band,
            "type": "ContextAdded",
        },
        {
            "ts": context["ts"],
            "channel": "chip.on_phone",
            "amount_band": amount_band,
            "type": "ContextAdded",
        },
    ]


def test_amount_band_comes_from_session_opened(client: TestClient) -> None:
    opened = client.post("/sessions", json={"mode": "live", "amount_band": "1000_4999"})
    assert opened.status_code == 200, opened.text
    session_id = opened.json()["session_id"]
    client.post(f"/sessions/{session_id}/context", json={"chips": ["chip.rushed"]})
    body = client.get(f"/sessions/{session_id}/activity").json()
    assert_activity(body)
    assert body["rows"]
    assert {row["amount_band"] for row in body["rows"]} == {"1000_4999"}
    assert body["rows"][0]["channel"] == "chip.rushed"
    assert body["rows"][0]["type"] == "ContextAdded"


def test_get_is_read_only_and_does_not_append(client: TestClient) -> None:
    session_id, _amount = _open(client)
    before = _events(client, session_id)
    first = client.get(f"/sessions/{session_id}/activity")
    second = client.get(f"/sessions/{session_id}/activity")
    assert first.status_code == 200
    assert second.status_code == 200
    after = _events(client, session_id)
    assert [event["type"] for event in after] == [event["type"] for event in before]
    assert len(after) == len(before)
    assert first.json() == second.json()


def test_no_write_route(client: TestClient) -> None:
    session_id, _amount = _open(client)
    response = client.post(f"/sessions/{session_id}/activity", json={"rows": []})
    assert response.status_code == 405


def test_undo_drops_undone_context_rows(client: TestClient) -> None:
    session_id, _amount = _open(client)
    posted = client.post(
        f"/sessions/{session_id}/context", json={"chips": ["chip.cash_only"]}
    )
    assert posted.status_code == 200, posted.text
    filled = client.get(f"/sessions/{session_id}/activity")
    assert_activity(filled.json())
    assert filled.json()["rows"]
    undone = client.post(f"/sessions/{session_id}/undo")
    assert undone.status_code == 200, undone.text
    empty = client.get(f"/sessions/{session_id}/activity")
    assert empty.status_code == 200, empty.text
    body = empty.json()
    assert_activity(body)
    assert body == {"session_id": session_id, "rows": []}


def test_activity_contains_no_free_text(client: TestClient) -> None:
    session_id, _amount = _open(client)
    client.post(
        f"/sessions/{session_id}/context",
        json={"chips": ["chip.cash_only", "chip.on_phone"]},
    )
    opener = T1["steps"][2]["request"]
    answered = client.post(
        f"/sessions/{session_id}/answers",
        json={**opener, "note": NOTE_CANARY},
    )
    assert answered.status_code == 200, answered.text
    response = client.get(f"/sessions/{session_id}/activity")
    assert response.status_code == 200, response.text
    assert_activity(response.json())
    dumped = json.dumps(response.json())
    assert NOTE_CANARY not in dumped
    assert "Insists on cash" not in dumped
    assert "On the phone" not in dumped
    assert "note" not in dumped


def test_activity_is_not_fed_to_session_render(client: TestClient) -> None:
    session_id, _amount = _open(client)
    client.post(f"/sessions/{session_id}/context", json={"chips": ["chip.cash_only"]})
    before = client.get(f"/sessions/{session_id}")
    assert before.status_code == 200, before.text
    activity = client.get(f"/sessions/{session_id}/activity")
    assert activity.status_code == 200, activity.text
    assert_activity(activity.json())
    after = client.get(f"/sessions/{session_id}")
    assert after.status_code == 200, after.text
    assert after.json() == before.json()
    assert "activity" not in after.json()


def test_project_activity_uses_only_stored_events() -> None:
    from api.activity import project_activity

    events = [
        {
            "type": "SessionOpened",
            "ts": "2026-10-25T01:00:00",
            "mode": "live",
            "amount_band": "5000_9999",
        },
        {
            "type": "ContextAdded",
            "ts": "2026-10-25T01:00:01",
            "chips": ["chip.above_threshold"],
        },
        {
            "type": "AnswerRecorded",
            "ts": "2026-10-25T01:00:02",
            "question_id": "q.purpose.open",
            "chip": "specific",
            "purpose": "purpose.home_repair",
            "note": NOTE_CANARY,
        },
    ]
    body = project_activity("sess-1", events)
    assert_activity(body)
    assert body == {
        "session_id": "sess-1",
        "rows": [
            {
                "ts": "2026-10-25T01:00:01",
                "channel": "chip.above_threshold",
                "amount_band": "5000_9999",
                "type": "ContextAdded",
            }
        ],
    }
    assert NOTE_CANARY not in json.dumps(body)
