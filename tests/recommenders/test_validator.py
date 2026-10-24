"""A-05 step 2: validator drops fabricated IDs (§9, §7.5)."""

from __future__ import annotations

from pathlib import Path

from tests.recommenders.conftest import load_case, make_client, replay
from tests.recommenders.fakes import FakeRecommender

from store import sqlite as store

FABRICATED = "q.fabricated.not_in_library"


def test_validator_drops_fabricated_ids(tmp_path: Path) -> None:
    fake = FakeRecommender(question_id=FABRICATED)
    case = load_case("T2")
    # T2 step 3 (0-based) is the first probe-stage render with no stop.
    probe_step = next(
        index
        for index, step in enumerate(case["steps"])
        if (step["response"].get("question") or {}).get("stage") == "probe"
        and step["response"].get("stop") is None
    )
    expected = case["steps"][probe_step]["response"]["question"]["id"]
    with make_client(tmp_path, recommender="local", recommender_impl=fake) as client:
        payload = replay(client, case, through=probe_step)
        assert fake.calls, "recommender must run in the probe stage"
        assert payload["question"]["id"] == expected
        assert payload["question"]["source"] == "rules"
        assert payload["debug"]["rejections"] >= 1

        events = store.load_events(client.app.state.db, payload["session_id"])
        rejected = [event for event in events if event.get("type") == "ValidationRejected"]
        assert rejected, "ValidationRejected must be appended"
        assert rejected[-1]["field"] == "next_question_id"
        assert rejected[-1]["raw_value"] == FABRICATED
