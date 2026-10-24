"""A-05 step 2 / §9: validator drops fabricated IDs and falls back to rules."""

from __future__ import annotations

from tests.recommenders.conftest import FakeRecommender, events_from_steps, t2_steps

from engine import candidates, project, rule_choice, stop
from engine.library import Library


def test_validator_drops_fabricated_ids(library: Library) -> None:
    events = events_from_steps(t2_steps()[:4])
    state = project(events, library)
    stage, cands = candidates(state, library)
    assert stage == "probe"
    assert cands
    assert stop(state, library, cands) is None
    rules_top = rule_choice(cands)

    fake = FakeRecommender("q.fabricated.not_in_library")
    from recommenders.metrics import Metrics
    from recommenders.select import select_question

    metrics = Metrics()
    selection = select_question(
        fake,
        state,
        cands,
        library,
        stage=stage,
        stopped=False,
        events=events,
        metrics=metrics,
        model_id="test-model",
    )

    assert fake.calls, "recommender should have been consulted in probe"
    assert selection.question_id == rules_top
    assert selection.source == "rules"
    assert selection.rejected is True
    kinds = [event["type"] for event in selection.events]
    assert "ValidationRejected" in kinds
    rejected = next(
        event for event in selection.events if event["type"] == "ValidationRejected"
    )
    assert rejected["field"] == "next_question_id"
    assert rejected["raw_value"] == "q.fabricated.not_in_library"
    issued = next(
        event for event in selection.events if event["type"] == "RecommendationIssued"
    )
    assert issued["question_id"] == rules_top
    assert issued["source"] == "rules"
    assert metrics.rejections >= 1
