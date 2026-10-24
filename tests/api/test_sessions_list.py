"""GET /sessions mode filter: default and live stay live-only; all is live+practice."""

from __future__ import annotations

from fastapi.testclient import TestClient


def _ids(response) -> set[str]:
    body = response.json()
    assert "sessions" in body
    return {row["session_id"] for row in body["sessions"]}


def test_list_sessions_mode_all_live_default_practice(client: TestClient) -> None:
    live = client.post("/sessions", json={"mode": "live", "amount_band": "5000_9999"})
    practice = client.post("/sessions", json={"mode": "practice", "amount_band": "5000_9999"})
    assert live.status_code == 200, live.text
    assert practice.status_code == 200, practice.text
    live_id = live.json()["session_id"]
    practice_id = practice.json()["session_id"]

    default = client.get("/sessions")
    live_only = client.get("/sessions", params={"mode": "live"})
    practice_only = client.get("/sessions", params={"mode": "practice"})
    all_modes = client.get("/sessions", params={"mode": "all"})

    assert default.status_code == 200
    assert live_only.status_code == 200
    assert practice_only.status_code == 200
    assert all_modes.status_code == 200

    assert _ids(default) == {live_id}
    assert _ids(live_only) == {live_id}
    assert _ids(practice_only) == {practice_id}
    assert _ids(all_modes) == {live_id, practice_id}
