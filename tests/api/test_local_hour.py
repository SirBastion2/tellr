"""Local hour comes from an offset timestamp or IANA zone, never naive UTC."""

from __future__ import annotations

import re

import pytest
from fastapi.testclient import TestClient

from api.time import iso_now, local_hour, resolve_session_time
from store import sqlite as store

OFFSET_TS = "2026-10-25T01:17:00-04:00"
UTC_TS = "2026-10-25T05:17:00Z"
NAIVE_UTC = "2026-10-25T05:17:00"
ZONE = "America/New_York"


def test_local_hour_from_offset_timestamp() -> None:
    assert local_hour(OFFSET_TS) == 1
    assert local_hour("2026-10-25T01:17:00-04:00") != 5


def test_local_hour_from_utc_and_iana_timezone() -> None:
    assert local_hour(UTC_TS, timezone=ZONE) == 1
    assert local_hour("2026-10-25T05:17:00+00:00", timezone=ZONE) == 1


def test_naive_utc_is_not_a_local_hour() -> None:
    with pytest.raises(ValueError, match="naive UTC"):
        local_hour(NAIVE_UTC)
    with pytest.raises(ValueError, match="naive UTC"):
        resolve_session_time(NAIVE_UTC, None)


def test_iso_now_is_timezone_aware() -> None:
    stamp = iso_now()
    assert re.search(r"(Z|[+-]\d{2}:\d{2})$", stamp)
    assert "T" in stamp
    eastern = iso_now(ZONE)
    assert local_hour(eastern) == local_hour(eastern, timezone=ZONE)


def test_open_session_stores_client_offset_timestamp(client: TestClient) -> None:
    response = client.post(
        "/sessions",
        json={
            "mode": "live",
            "amount_band": "5000_9999",
            "opened_at": OFFSET_TS,
        },
    )
    assert response.status_code == 200, response.text
    session_id = response.json()["session_id"]
    events = store.load_events(client.app.state.db, session_id)
    opened = next(event for event in events if event["type"] == "SessionOpened")
    assert opened["ts"] == OFFSET_TS
    assert local_hour(opened["ts"]) == 1
    listed = client.get("/sessions").json()["sessions"]
    row = next(item for item in listed if item["session_id"] == session_id)
    assert row["opened_at"] == OFFSET_TS
    assert local_hour(row["opened_at"]) == 1


def test_open_session_uses_iana_timezone_for_local_hour(client: TestClient) -> None:
    response = client.post(
        "/sessions",
        json={
            "mode": "live",
            "amount_band": "5000_9999",
            "opened_at": UTC_TS,
            "timezone": ZONE,
        },
    )
    assert response.status_code == 200, response.text
    session_id = response.json()["session_id"]
    events = store.load_events(client.app.state.db, session_id)
    opened = next(event for event in events if event["type"] == "SessionOpened")
    assert local_hour(opened["ts"], timezone=ZONE) == 1
    assert opened["ts"].endswith("-04:00")
    assert local_hour(opened["ts"]) == 1
