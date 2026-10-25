"""CHANGE-005 (a): optional explanation on every SessionState response."""

from __future__ import annotations

import shutil
import time
from collections.abc import Iterator
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient
from tests.api.conftest import assert_session_state, comparable, load_cases
from tests.recommenders.conftest import FakeRecommender, t2_steps

ROOT = Path(__file__).resolve().parents[2]
LIVE = ROOT / "library"


def _live_signals() -> dict[str, dict]:
    data = yaml.safe_load((LIVE / "signals.yaml").read_text(encoding="utf-8"))
    return {item["id"]: item for item in data["signals"]}


def _post_step(client: TestClient, session_id: str | None, step: dict) -> object:
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


def _walk(client: TestClient, steps: list[dict], through: int) -> tuple[str, dict]:
    session_id: str | None = None
    payload: dict | None = None
    for step in steps[: through + 1]:
        response = _post_step(client, session_id, step)
        assert response.status_code == 200, response.text
        payload = response.json()
        assert_session_state(payload)
        session_id = payload["session_id"]
    assert session_id is not None and payload is not None
    return session_id, payload


def _assert_contributions_match_live(rows: list[dict]) -> None:
    live = _live_signals()
    prev: tuple[int, str] | None = None
    for row in rows:
        spec = live[row["signal_id"]]
        assert row["label"] == spec["name"]
        assert row["weight"] == spec["weight"]
        assert row["direction"] == ("raises" if spec["weight"] > 0 else "lowers")
        key = (-abs(int(row["weight"])), row["signal_id"])
        if prev is not None:
            assert key >= prev
        prev = key


@pytest.fixture
def model_client(tmp_path: Path) -> Iterator[tuple[TestClient, FakeRecommender]]:
    from api.main import create_app

    fake = FakeRecommender("q.secrecy.told_not_to_tell")
    app = create_app(
        db_path=tmp_path / "teller.sqlite",
        recommender="local_llm",
        model_id="test-model",
        recommender_impl=fake,
        timeout_ms=200,
    )
    with TestClient(app) as client:
        yield client, fake


def test_rules_session_includes_schema_valid_explanation(client: TestClient) -> None:
    opened = client.post("/sessions", json={"mode": "live", "amount_band": "5000_9999"})
    assert opened.status_code == 200, opened.text
    body = opened.json()
    assert_session_state(body)
    explanation = body["explanation"]
    assert explanation["confidence"] is None
    assert explanation["used_fallback"] is False
    assert explanation["contributions"] == []


def test_explanation_does_not_change_existing_fixture_fields(client: TestClient) -> None:
    for case in load_cases():
        session_id: str | None = None
        for index, step in enumerate(case["steps"]):
            response = _post_step(client, session_id, step)
            assert response.status_code == 200, response.text
            payload = response.json()
            assert_session_state(payload)
            session_id = payload["session_id"]
            expected = step["response"]
            assert payload["risk"]["score"] == expected["risk"]["score"], (
                case["case"],
                index,
            )
            assert payload["risk"]["level"] == expected["risk"]["level"]
            assert payload["risk"]["reasons"] == expected["risk"]["reasons"]
            assert comparable(payload) == comparable(expected)


def test_contributions_list_asserted_signals_from_live_library(
    client: TestClient,
) -> None:
    t1 = next(item for item in load_cases() if item["case"] == "T1")
    _session_id, after_context = _walk(client, t1["steps"], through=1)
    rows = after_context["explanation"]["contributions"]
    assert [row["signal_id"] for row in rows] == [
        "sig.third_party_call",
        "sig.cash_insistence",
    ]
    _assert_contributions_match_live(rows)
    assert after_context["explanation"]["confidence"] is None
    assert after_context["explanation"]["used_fallback"] is False

    _session_id, after_opener = _walk(client, t1["steps"], through=2)
    mixed = after_opener["explanation"]["contributions"]
    assert [row["signal_id"] for row in mixed] == [
        "sig.third_party_call",
        "sig.cash_insistence",
        "mit.purpose_specific",
    ]
    assert mixed[-1]["direction"] == "lowers"
    _assert_contributions_match_live(mixed)


def test_contributions_weights_follow_library_loaded_by_api(tmp_path: Path) -> None:
    from api.main import create_app

    lib_dir = tmp_path / "library"
    shutil.copytree(LIVE, lib_dir)
    data = yaml.safe_load((lib_dir / "signals.yaml").read_text(encoding="utf-8"))
    for signal in data["signals"]:
        if signal["id"] == "sig.cash_insistence":
            signal["weight"] = 99
            signal["name"] = "Live cash label"
    (lib_dir / "signals.yaml").write_text(yaml.safe_dump(data), encoding="utf-8")

    app = create_app(db_path=tmp_path / "teller.sqlite", library_path=lib_dir)
    with TestClient(app) as client:
        opened = client.post("/sessions", json={"mode": "live", "amount_band": "1000_4999"})
        assert opened.status_code == 200, opened.text
        session_id = opened.json()["session_id"]
        posted = client.post(
            f"/sessions/{session_id}/context",
            json={"chips": ["chip.cash_only"]},
        )
        assert posted.status_code == 200, posted.text
        rows = posted.json()["explanation"]["contributions"]
    assert rows == [
        {
            "signal_id": "sig.cash_insistence",
            "label": "Live cash label",
            "weight": 99,
            "direction": "raises",
        }
    ]
    shipped = _live_signals()["sig.cash_insistence"]
    assert shipped["weight"] != 99
    assert shipped["name"] != "Live cash label"


def test_model_timeout_sets_used_fallback_for_that_turn(tmp_path: Path) -> None:
    from api.main import create_app

    fake = FakeRecommender("q.secrecy.told_not_to_tell", delay_s=0.4)
    app = create_app(
        db_path=tmp_path / "teller.sqlite",
        recommender="local_llm",
        model_id="test-model",
        recommender_impl=fake,
        timeout_ms=80,
    )
    with TestClient(app) as client:
        session_id, before = _walk(client, t2_steps(), through=2)
        assert before["explanation"]["used_fallback"] is False
        probe = _post_step(client, session_id, t2_steps()[3])
        assert probe.status_code == 200, probe.text
        body = probe.json()
        assert_session_state(body)
        assert body["explanation"]["used_fallback"] is True
        assert body["explanation"]["confidence"] is None
        fetched = client.get(f"/sessions/{session_id}")
        assert fetched.status_code == 200
        assert fetched.json()["explanation"]["used_fallback"] is True


def test_model_rejection_sets_used_fallback_for_that_turn(
    model_client: tuple[TestClient, FakeRecommender],
) -> None:
    client, fake = model_client
    fake.question_id = "q.fabricated.not_in_library"
    session_id, before = _walk(client, t2_steps(), through=2)
    assert before["explanation"]["used_fallback"] is False
    probe = _post_step(client, session_id, t2_steps()[3])
    assert probe.status_code == 200, probe.text
    body = probe.json()
    assert_session_state(body)
    assert body["debug"]["rejections"] >= 1
    assert body["explanation"]["used_fallback"] is True


def test_model_success_does_not_set_used_fallback(
    model_client: tuple[TestClient, FakeRecommender],
) -> None:
    client, _fake = model_client
    _session_id, body = _walk(client, t2_steps(), through=3)
    assert body["debug"]["rejections"] == 0
    assert body["explanation"]["used_fallback"] is False
    assert body["explanation"]["confidence"] is None
    _assert_contributions_match_live(body["explanation"]["contributions"])


def test_used_fallback_is_per_turn_not_session_wide(tmp_path: Path) -> None:
    from api.main import create_app
    from recommenders.base import Recommendation

    class FlipRecommender:
        def __init__(self) -> None:
            self.calls = 0

        def next(self, state: object, candidates: list[object]) -> Recommendation:
            del state
            ids = [
                item.id if hasattr(item, "id") else str(item) for item in candidates
            ]
            self.calls += 1
            if self.calls == 1:
                time.sleep(0.35)
            return Recommendation(next_question_id=ids[0], signals_asserted=[])

    app = create_app(
        db_path=tmp_path / "teller.sqlite",
        recommender="local_llm",
        model_id="test-model",
        recommender_impl=FlipRecommender(),
        timeout_ms=80,
    )
    steps = t2_steps()
    with TestClient(app) as client:
        session_id, first_probe = _walk(client, steps, through=3)
        assert first_probe["explanation"]["used_fallback"] is True
        nxt = _post_step(client, session_id, steps[4])
        assert nxt.status_code == 200, nxt.text
        body = nxt.json()
        assert_session_state(body)
        assert body["explanation"]["used_fallback"] is False
