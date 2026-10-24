"""A-05 step 3: a 2 s fake falls back to rules at 1500 ms (§8.3)."""

from __future__ import annotations

import time

from tests.recommenders.conftest import FakeRecommender, events_from_steps, t2_steps

from engine import candidates, project, rule_choice, stop
from engine.library import Library


def test_timeout_falls_back_to_rules(library: Library) -> None:
    events = events_from_steps(t2_steps()[:4])
    state = project(events, library)
    stage, cands = candidates(state, library)
    assert stage == "probe" and cands
    assert stop(state, library, cands) is None
    rules_top = rule_choice(cands)

    fake = FakeRecommender(cands[-1], delay_s=2.0)
    from recommenders.metrics import Metrics
    from recommenders.select import select_question

    metrics = Metrics()
    t0 = time.perf_counter()
    selection = select_question(
        fake,
        state,
        cands,
        library,
        stage=stage,
        stopped=False,
        events=events,
        metrics=metrics,
        timeout_ms=1500,
        model_id="test-model",
    )
    elapsed_ms = (time.perf_counter() - t0) * 1000

    assert selection.question_id == rules_top
    assert selection.source == "rules"
    assert selection.fallback is True
    assert metrics.fallbacks >= 1
    issued = next(
        event for event in selection.events if event["type"] == "RecommendationIssued"
    )
    assert issued["source"] == "rules"
    assert issued["question_id"] == rules_top
    assert 1400 <= elapsed_ms < 2800
