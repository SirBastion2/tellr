"""A-05 step 3: 1500 ms timeout falls back to rules (§8.3, §14.2)."""

from __future__ import annotations

from pathlib import Path

from tests.recommenders.conftest import load_case, make_client, replay
from tests.recommenders.fakes import FakeRecommender


def test_slow_recommender_falls_back_to_rules_at_1500ms(tmp_path: Path) -> None:
    fake = FakeRecommender(delay_s=2.0, question_id="q.alternative.cashiers_check")
    case = load_case("T2")
    probe_step = next(
        index
        for index, step in enumerate(case["steps"])
        if (step["response"].get("question") or {}).get("stage") == "probe"
        and step["response"].get("stop") is None
    )
    expected = case["steps"][probe_step]["response"]["question"]["id"]
    with make_client(tmp_path, recommender="local", recommender_impl=fake) as client:
        payload = replay(client, case, through=probe_step)
        assert payload["question"]["id"] == expected
        assert payload["question"]["source"] == "rules"
        health = client.get("/health").json()
        assert health["fallback_rate"] > 0
        assert fake.calls, "the slow recommender was invoked before the timeout"
