"""A-05 step 5: strict mode + recommender only in probe, never after a stop."""

from __future__ import annotations

from pathlib import Path

from tests.recommenders.conftest import load_case, make_client, replay
from tests.recommenders.fakes import FakeRecommender

from recommenders.orchestrate import choose


def test_strict_mode_signals_asserted_always_empty() -> None:
    fake = FakeRecommender(
        question_id="q.secrecy.told_not_to_tell",
        signals_asserted=["sig.script_echo", "sig.secrecy_bank"],
    )
    cands = [
        type("Q", (), {"id": "q.secrecy.told_not_to_tell", "why": "x"})(),
        type("Q", (), {"id": "q.alternative.cashiers_check", "why": "y"})(),
    ]
    choice = choose(
        fake,
        {"stated_purpose": "purpose.moving_money"},
        cands,
        rule_id="q.secrecy.told_not_to_tell",
        timeout_ms=1500,
        library_ids={item.id for item in cands},
    )
    assert choice.signals_asserted == []
    assert choice.source == "model"


def test_recommender_never_called_outside_probe_or_after_stop(tmp_path: Path) -> None:
    fake = FakeRecommender()
    t2 = load_case("T2")
    t1 = load_case("T1")
    with make_client(tmp_path, recommender="local", recommender_impl=fake) as client:
        replay(client, t2)
        replay(client, t1)
        probe_no_stop = 0
        for case in (t2, t1):
            for step in case["steps"]:
                question = step["response"].get("question") or {}
                if question.get("stage") == "probe" and step["response"].get("stop") is None:
                    probe_no_stop += 1
        assert fake.calls, "probe-stage turns must call the recommender"
        assert len(fake.calls) == probe_no_stop
        for _state, candidate_ids in fake.calls:
            assert "q.purpose.open" not in candidate_ids or candidate_ids != ["q.purpose.open"]
