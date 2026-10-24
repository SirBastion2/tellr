"""Shared helpers for recommender acceptance tests."""

from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "contract" / "fixtures"


def load_cases() -> list[dict[str, Any]]:
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(FIXTURES.glob("T*.json"))
    ]


def load_case(name: str) -> dict[str, Any]:
    return next(case for case in load_cases() if case["case"] == name)


def post_step(client: TestClient, session_id: str | None, step: dict) -> object:
    endpoint = step["endpoint"]
    body = step["request"]
    if endpoint == "POST /sessions":
        return client.post("/sessions", json=body)
    assert session_id is not None
    if endpoint.endswith("/context"):
        return client.post(f"/sessions/{session_id}/context", json=body)
    if endpoint.endswith("/answers"):
        return client.post(f"/sessions/{session_id}/answers", json=body)
    raise AssertionError(f"unexpected fixture endpoint {endpoint}")


def replay(client: TestClient, case: dict, *, through: int | None = None) -> dict:
    """Replay fixture requests. `through` is an inclusive step index."""
    session_id: str | None = None
    payload: dict = {}
    steps = case["steps"] if through is None else case["steps"][: through + 1]
    for step in steps:
        response = post_step(client, session_id, step)
        assert response.status_code == 200, response.text
        payload = response.json()
        session_id = payload["session_id"]
    return payload


def events_to_prompt_inputs(events: list[dict], state: dict, library: Any) -> dict:
    """Allowlisted prompt fields only (§10.2). Notes and amount_band stay out."""
    chips: list[str] = []
    transcript: list[tuple[str, str]] = []
    for event in events:
        kind = event.get("type")
        if kind == "ContextAdded":
            chips.extend(event.get("chips") or [])
        elif kind == "AnswerRecorded":
            transcript.append((event["question_id"], event["chip"]))
    pattern = (state.get("risk") or {}).get("pattern")
    evidence = list((state.get("_engine") or {}).get("evidence") or [])
    if not evidence:
        evidence = [item["id"] for item in (state.get("risk") or {}).get("reasons") or []]
    stage_cands = []
    question = state.get("question")
    if question:
        match = next((item for item in library.questions if item.id == question["id"]), None)
        stage_cands = [{"id": question["id"], "why": match.why if match else question.get("why", "")}]
    return {
        "context_chips": chips,
        "stated_purpose": state.get("stated_purpose"),
        "transcript": transcript,
        "evidence_ids": evidence,
        "leading_pattern": pattern["id"] if pattern else None,
        "candidates": stage_cands,
    }


def request_events(case: dict) -> list[dict]:
    events: list[dict] = []
    for step in case["steps"]:
        endpoint = step["endpoint"]
        req = step["request"]
        if endpoint == "POST /sessions":
            events.append(
                {
                    "type": "SessionOpened",
                    "mode": req["mode"],
                    "amount_band": req["amount_band"],
                    "library_version": "1.2.0",
                }
            )
        elif endpoint.endswith("/context"):
            events.append({"type": "ContextAdded", "chips": list(req["chips"])})
        elif endpoint.endswith("/answers"):
            events.append(
                {
                    "type": "AnswerRecorded",
                    "question_id": req["question_id"],
                    "chip": req["chip"],
                    "purpose": req.get("purpose"),
                    "note": req.get("note"),
                }
            )
    return events


def make_client(tmp_path: Path, **kwargs: Any) -> TestClient:
    from api.main import create_app

    db_name = kwargs.pop("db_name", "teller.sqlite")
    app = create_app(db_path=tmp_path / db_name, **kwargs)
    return TestClient(app)


@pytest.fixture
def rules_client(tmp_path: Path) -> Iterator[TestClient]:
    with make_client(tmp_path, recommender="rules") as client:
        yield client
