"""CHANGE-002 command-handler mapping: 409 {error:{code,message}} and 422 for bad bodies."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient
from starlette.requests import Request

from engine import CommandRejected
from tests.api.conftest import assert_error_body, assert_session_state

ROOT = Path(__file__).resolve().parents[2]
T1 = json.loads((ROOT / "contract" / "fixtures" / "T1.json").read_text(encoding="utf-8"))

CODES = (
    "outcome_requires_actor",
    "close_without_outcome",
    "purpose_required_on_opener",
    "purpose_not_allowed",
    "session_closed",
    "scenario_on_live_session",
)


def _open(client: TestClient) -> str:
    response = client.post("/sessions", json=T1["steps"][0]["request"])
    assert response.status_code == 200, response.text
    assert_session_state(response.json())
    return response.json()["session_id"]


def _replay_through_opener(client: TestClient) -> str:
    session_id: str | None = None
    for step in T1["steps"][:3]:
        endpoint = step["endpoint"]
        if endpoint == "POST /sessions":
            response = client.post("/sessions", json=step["request"])
        elif endpoint.endswith("/context"):
            response = client.post(f"/sessions/{session_id}/context", json=step["request"])
        else:
            response = client.post(f"/sessions/{session_id}/answers", json=step["request"])
        assert response.status_code == 200, response.text
        session_id = response.json()["session_id"]
    assert session_id is not None
    return session_id


def _assert_409(response: object, code: str) -> None:
    assert response.status_code == 409, response.text
    body = response.json()
    assert_error_body(body)
    assert body["error"]["code"] == code
    assert body["error"]["message"]


def test_all_six_codes_map_to_409_error_envelope() -> None:
    from api.errors import rejected_response

    request = Request({"type": "http", "method": "POST", "path": "/", "headers": []})
    for code in CODES:
        response = rejected_response(
            request, CommandRejected(code, f"{code} rejected")
        )
        assert response.status_code == 409
        body = json.loads(response.body)
        assert_error_body(body)
        assert body["error"]["code"] == code
        assert body["error"]["message"] == f"{code} rejected"


def test_scenario_on_live_session_is_409(client: TestClient) -> None:
    response = client.post(
        "/sessions",
        json={"mode": "live", "amount_band": "5000_9999", "scenario_id": "T1"},
    )
    _assert_409(response, "scenario_on_live_session")


def test_purpose_required_on_opener_is_409(client: TestClient) -> None:
    session_id = _open(client)
    response = client.post(
        f"/sessions/{session_id}/answers",
        json={"question_id": "q.purpose.open", "chip": "specific"},
    )
    _assert_409(response, "purpose_required_on_opener")


def test_purpose_not_allowed_is_409(client: TestClient) -> None:
    session_id = _replay_through_opener(client)
    response = client.post(
        f"/sessions/{session_id}/answers",
        json={
            "question_id": "q.homerepair.contractor_name",
            "chip": "specific",
            "purpose": "purpose.home_repair",
        },
    )
    _assert_409(response, "purpose_not_allowed")


def test_outcome_requires_actor_is_409(client: TestClient) -> None:
    session_id = _open(client)
    response = client.post(
        f"/sessions/{session_id}/outcome",
        json={"outcome": "proceed"},
    )
    _assert_409(response, "outcome_requires_actor")


def test_session_closed_is_409(client: TestClient) -> None:
    session_id = _open(client)
    recorded = client.post(
        f"/sessions/{session_id}/outcome",
        json={"outcome": "proceed", "actor": "teller"},
    )
    assert recorded.status_code == 200, recorded.text
    assert_session_state(recorded.json())
    response = client.post(
        f"/sessions/{session_id}/context",
        json={"chips": ["chip.cash_only"]},
    )
    _assert_409(response, "session_closed")


def test_close_without_outcome_is_409_via_handler(client: TestClient) -> None:
    """No close endpoint (Q-009); mapping is still required for the six-code enum."""
    from api.errors import rejected_response

    _open(client)
    request = Request({"type": "http", "method": "POST", "path": "/", "headers": []})
    response = rejected_response(
        request, CommandRejected("close_without_outcome", "cannot close without an outcome")
    )
    assert response.status_code == 409
    body = json.loads(response.body)
    assert_error_body(body)
    assert body["error"]["code"] == "close_without_outcome"


def test_malformed_bodies_are_422(client: TestClient) -> None:
    session_id = _open(client)
    missing_mode = client.post("/sessions", json={"amount_band": "5000_9999"})
    assert missing_mode.status_code == 422
    bad_mode = client.post("/sessions", json={"mode": "demo", "amount_band": "5000_9999"})
    assert bad_mode.status_code == 422
    chips_not_list = client.post(f"/sessions/{session_id}/context", json={"chips": "chip.cash_only"})
    assert chips_not_list.status_code == 422
    missing_chip = client.post(
        f"/sessions/{session_id}/answers",
        json={"question_id": "q.purpose.open"},
    )
    assert missing_chip.status_code == 422
    missing_outcome = client.post(f"/sessions/{session_id}/outcome", json={"actor": "teller"})
    assert missing_outcome.status_code == 422
