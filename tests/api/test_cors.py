"""Browser Vite origin must reach the API (Practice /library + opener)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from tests.api.conftest import assert_session_state

VITE_ORIGIN = "http://127.0.0.1:5173"


def _allow_origin(response) -> str | None:
    return response.headers.get("access-control-allow-origin")


def test_preflight_and_practice_opener_from_vite_origin(client: TestClient) -> None:
    preflight = client.options(
        "/sessions",
        headers={
            "Origin": VITE_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert preflight.status_code == 200, preflight.text
    assert _allow_origin(preflight) in {VITE_ORIGIN, "*"}

    library = client.get("/library", headers={"Origin": VITE_ORIGIN})
    assert library.status_code == 200, library.text
    assert _allow_origin(library) in {VITE_ORIGIN, "*"}
    purposes = library.json()["purposes"]
    assert purposes, "Interview opener renders purpose chips from GET /library"
    purpose_id = purposes[0]["id"]

    opened = client.post(
        "/sessions?case=T2",
        headers={"Origin": VITE_ORIGIN},
        json={
            "mode": "practice",
            "amount_band": "5000_9999",
            "scenario_id": "T2",
        },
    )
    assert opened.status_code == 200, opened.text
    assert _allow_origin(opened) in {VITE_ORIGIN, "*"}
    assert_session_state(opened.json())
    assert opened.json()["mode"] == "practice"
    question = opened.json()["question"]
    assert question["id"] == "q.purpose.open"
    assert question["stage"] == "opener"

    answered = client.post(
        f"/sessions/{opened.json()['session_id']}/answers",
        headers={"Origin": VITE_ORIGIN},
        json={
            "question_id": question["id"],
            "chip": question["chips"][0],
            "purpose": purpose_id,
        },
    )
    assert answered.status_code == 200, answered.text
    assert _allow_origin(answered) in {VITE_ORIGIN, "*"}
    assert_session_state(answered.json())
    assert answered.json()["stated_purpose"] == purpose_id
    assert answered.json()["answers"] == 1
