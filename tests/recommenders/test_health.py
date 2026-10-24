"""A-05 step 7: /health exposes §16 recommender metrics."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from tests.recommenders.conftest import FakeRecommender, t2_steps


def _walk_t2(client: TestClient, through: int) -> str:
    session_id: str | None = None
    for step in t2_steps()[: through + 1]:
        endpoint = step["endpoint"]
        body = step["request"]
        if endpoint == "POST /sessions":
            response = client.post("/sessions", json=body)
        elif endpoint.endswith("/context"):
            assert session_id is not None
            response = client.post(f"/sessions/{session_id}/context", json=body)
        else:
            assert session_id is not None
            response = client.post(f"/sessions/{session_id}/answers", json=body)
        assert response.status_code == 200, response.text
        session_id = response.json()["session_id"]
    assert session_id is not None
    return session_id


def test_health_fields_on_rules_boot(tmp_path: Path) -> None:
    from api.main import create_app

    app = create_app(db_path=tmp_path / "teller.sqlite", recommender="rules")
    with TestClient(app) as client:
        body = client.get("/health").json()
    for key in (
        "recommender",
        "model_id",
        "p50",
        "p95",
        "fallback_rate",
        "rejection_count",
        "agreement_rate",
    ):
        assert key in body, key
    assert body["recommender"] == "rules"
    assert body["p50"] is None
    assert body["p95"] is None
    assert body["fallback_rate"] == 0.0
    assert body["rejection_count"] == 0
    assert body["agreement_rate"] is None


def test_health_counts_rejection_and_agreement(tmp_path: Path) -> None:
    from api.main import create_app
    from recommenders.metrics import Metrics

    fake = FakeRecommender("q.fabricated.not_in_library")
    metrics = Metrics()
    app = create_app(
        db_path=tmp_path / "teller.sqlite",
        recommender="local_llm",
        model_id="Meta-Llama-3.1-8B-Instruct-Q4_K_M",
        recommender_impl=fake,
        metrics=metrics,
    )
    with TestClient(app) as client:
        _walk_t2(client, through=3)
        body = client.get("/health").json()
    assert body["recommender"] == "local_llm"
    assert body["model_id"] == "Meta-Llama-3.1-8B-Instruct-Q4_K_M"
    assert body["rejection_count"] >= 1
    assert body["agreement_rate"] == 0.0
    assert body["p50"] is not None
    assert body["p95"] is not None
