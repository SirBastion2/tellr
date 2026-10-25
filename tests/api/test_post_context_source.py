"""CHANGE-005 (b): POST /context source and SessionState.context_chips."""

from __future__ import annotations

from fastapi.testclient import TestClient
from tests.api.conftest import assert_session_state

from store import sqlite as store


def _open(client: TestClient) -> str:
    response = client.post("/sessions", json={"mode": "practice", "amount_band": "5000_9999"})
    assert response.status_code == 200, response.text
    body = response.json()
    assert_session_state(body)
    assert body.get("context_chips") in (None, [])
    return body["session_id"]


def test_omitted_source_echoes_teller_chips(client: TestClient) -> None:
    session_id = _open(client)
    response = client.post(
        f"/sessions/{session_id}/context",
        json={"chips": ["chip.cash_only", "chip.on_phone"]},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert_session_state(body)
    assert body["context_chips"] == [
        {"id": "chip.cash_only", "source": "teller"},
        {"id": "chip.on_phone", "source": "teller"},
    ]
    stored = store.load_events(client.app.state.db, session_id)
    added = next(event for event in stored if event["type"] == "ContextAdded")
    assert "source" not in added or added["source"] == "teller"


def test_observed_source_is_stored_and_echoed(client: TestClient) -> None:
    session_id = _open(client)
    response = client.post(
        f"/sessions/{session_id}/context",
        json={"chips": ["chip.cash_only"], "source": "observed"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert_session_state(body)
    assert body["context_chips"] == [{"id": "chip.cash_only", "source": "observed"}]
    stored = store.load_events(client.app.state.db, session_id)
    added = next(event for event in stored if event["type"] == "ContextAdded")
    assert added["source"] == "observed"


def test_explicit_teller_source_is_echoed(client: TestClient) -> None:
    session_id = _open(client)
    response = client.post(
        f"/sessions/{session_id}/context",
        json={"chips": ["chip.rushed"], "source": "teller"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert_session_state(body)
    assert body["context_chips"] == [{"id": "chip.rushed", "source": "teller"}]


def test_invalid_source_is_rejected_as_malformed(client: TestClient) -> None:
    session_id = _open(client)
    response = client.post(
        f"/sessions/{session_id}/context",
        json={"chips": ["chip.cash_only"], "source": "model"},
    )
    assert response.status_code == 422, response.text
    assert store.load_events(client.app.state.db, session_id)[-1]["type"] != "ContextAdded"


def test_get_session_echoes_live_chips_after_reload(client: TestClient) -> None:
    session_id = _open(client)
    posted = client.post(
        f"/sessions/{session_id}/context",
        json={"chips": ["chip.cash_only"], "source": "observed"},
    )
    assert posted.status_code == 200, posted.text
    fetched = client.get(f"/sessions/{session_id}")
    assert fetched.status_code == 200, fetched.text
    body = fetched.json()
    assert_session_state(body)
    assert body["context_chips"] == posted.json()["context_chips"]
    assert body["context_chips"] == [{"id": "chip.cash_only", "source": "observed"}]


def test_undo_removes_undone_context_chips(client: TestClient) -> None:
    session_id = _open(client)
    first = client.post(
        f"/sessions/{session_id}/context",
        json={"chips": ["chip.cash_only"], "source": "observed"},
    )
    assert first.status_code == 200, first.text
    second = client.post(
        f"/sessions/{session_id}/context",
        json={"chips": ["chip.on_phone"], "source": "teller"},
    )
    assert second.status_code == 200, second.text
    assert [chip["id"] for chip in second.json()["context_chips"]] == [
        "chip.cash_only",
        "chip.on_phone",
    ]
    undone = client.post(f"/sessions/{session_id}/undo")
    assert undone.status_code == 200, undone.text
    body = undone.json()
    assert_session_state(body)
    assert body["context_chips"] == [{"id": "chip.cash_only", "source": "observed"}]
    again = client.post(f"/sessions/{session_id}/undo")
    assert again.status_code == 200, again.text
    assert again.json().get("context_chips") in (None, [])


def test_source_does_not_change_score_or_question(client: TestClient) -> None:
    chips = ["chip.cash_only", "chip.on_phone"]
    observed_id = _open(client)
    teller_id = _open(client)
    observed = client.post(
        f"/sessions/{observed_id}/context",
        json={"chips": chips, "source": "observed"},
    )
    teller = client.post(
        f"/sessions/{teller_id}/context",
        json={"chips": chips, "source": "teller"},
    )
    assert observed.status_code == 200, observed.text
    assert teller.status_code == 200, teller.text
    left = observed.json()
    right = teller.json()
    assert left["risk"] == right["risk"]
    assert left["question"] == right["question"]
    assert left["stop"] == right["stop"]
    assert left["context_chips"] != right["context_chips"]


def test_legacy_stored_event_without_source_folds_as_teller(client: TestClient) -> None:
    session_id = _open(client)
    store.append_event(
        client.app.state.db,
        session_id,
        {"type": "ContextAdded", "ts": "2026-10-25T00:00:00", "chips": ["chip.cash_only"]},
    )
    fetched = client.get(f"/sessions/{session_id}")
    assert fetched.status_code == 200, fetched.text
    body = fetched.json()
    assert_session_state(body)
    assert body["context_chips"] == [{"id": "chip.cash_only", "source": "teller"}]
    assert body["risk"]["score"] > 0
