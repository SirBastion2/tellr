"""Replay T1–T7 fixtures through the API (contract/api.md; A-04 A2 / ROSTER hours 4–6)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.api.conftest import (
    assert_session_state,
    comparable,
    load_cases,
)


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


@pytest.mark.parametrize("case", load_cases(), ids=lambda case: case["case"])
def test_fixture_replay_matches_contract(client: TestClient, case: dict) -> None:
    session_id: str | None = None
    for index, step in enumerate(case["steps"]):
        response, endpoint = _post_step(client, session_id, step)
        assert response.status_code == 200, f"{case['case']} step {index} {endpoint}: {response.text}"
        payload = response.json()
        assert_session_state(payload)
        if session_id is None:
            session_id = payload["session_id"]
            assert isinstance(session_id, str) and session_id
        else:
            assert payload["session_id"] == session_id
        assert comparable(payload) == comparable(step["response"]), (
            f"{case['case']} step {index} {endpoint} diverged from fixture"
        )


def test_get_session_matches_last_posted_state(client: TestClient) -> None:
    case = next(item for item in load_cases() if item["case"] == "T2")
    session_id: str | None = None
    last: dict | None = None
    for step in case["steps"]:
        response, _ = _post_step(client, session_id, step)
        assert response.status_code == 200, response.text
        last = response.json()
        session_id = last["session_id"]
    assert session_id is not None and last is not None
    fetched = client.get(f"/sessions/{session_id}")
    assert fetched.status_code == 200, fetched.text
    body = fetched.json()
    assert_session_state(body)
    assert comparable(body) == comparable(last)
    assert body["session_id"] == session_id
