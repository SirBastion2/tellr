"""A-05 step 7: /health exposes recommender, model, latency, fallback, rejections, agreement."""

from __future__ import annotations

from pathlib import Path

from tests.recommenders.conftest import load_case, make_client, replay
from tests.recommenders.fakes import FakeRecommender

REQUIRED = (
    "recommender",
    "model_id",
    "p50",
    "p95",
    "fallback_rate",
    "rejection_count",
    "agreement_rate",
)


def test_health_fields_on_rules_path(tmp_path: Path) -> None:
    with make_client(tmp_path, recommender="rules") as client:
        body = client.get("/health").json()
        for key in REQUIRED:
            assert key in body, key
        assert body["recommender"] == "rules"
        assert body["p50"] is None
        assert body["p95"] is None
        assert body["fallback_rate"] == 0.0
        assert body["rejection_count"] == 0
        assert body["agreement_rate"] is None


def test_health_records_rejection_and_agreement(tmp_path: Path) -> None:
    t2 = load_case("T2")
    probe_step = next(
        index
        for index, step in enumerate(t2["steps"])
        if (step["response"].get("question") or {}).get("stage") == "probe"
        and step["response"].get("stop") is None
    )
    top = t2["steps"][probe_step]["response"]["question"]["id"]

    reject = FakeRecommender(question_id="q.fabricated.nope")
    with make_client(tmp_path, recommender="local", recommender_impl=reject) as client:
        replay(client, t2, through=probe_step)
        health = client.get("/health").json()
        assert health["recommender"] == "local"
        assert health["model_id"]
        assert health["rejection_count"] == 1
        assert health["p50"] is not None
        assert health["p95"] is not None

    agree = FakeRecommender(question_id=top)
    with make_client(
        tmp_path, db_name="agree.sqlite", recommender="local", recommender_impl=agree
    ) as client:
        replay(client, t2, through=probe_step)
        health = client.get("/health").json()
        assert health["agreement_rate"] == 1.0
        assert health["rejection_count"] == 0

    def pick_other(state, candidates):  # noqa: ARG001
        from recommenders.base import Recommendation

        ids = [getattr(item, "id", item) for item in candidates]
        chosen = next(item for item in ids if item != top)
        return Recommendation(next_question_id=chosen, signals_asserted=[])

    other_fake = FakeRecommender()
    other_fake.next = pick_other  # type: ignore[method-assign]
    with make_client(
        tmp_path, db_name="disagree.sqlite", recommender="local", recommender_impl=other_fake
    ) as client:
        payload = replay(client, t2, through=probe_step)
        assert payload["question"]["id"] != top
        assert payload["question"]["source"] == "model"
        health = client.get("/health").json()
        assert health["agreement_rate"] == 0.0
        assert health["rejection_count"] == 0
