"""A-05 step 5: strict mode empties signals_asserted; probe-only, never after stop."""

from __future__ import annotations

from tests.recommenders.conftest import FakeRecommender, events_from_steps, t2_steps

from engine import candidates, project, stop
from engine.library import Library


def _select(fake: FakeRecommender, state, cands, library: Library, *, stopped: bool):
    from recommenders.metrics import Metrics
    from recommenders.select import select_question

    stage, _ = candidates(state, library)
    return select_question(
        fake,
        state,
        cands,
        library,
        stage=stage,
        stopped=stopped,
        events=[],
        metrics=Metrics(),
        strict=True,
        model_id="test-model",
    )


def test_strict_mode_empty_signals_and_probe_only(library: Library) -> None:
    steps = t2_steps()

    opener_events = events_from_steps(steps[:1])
    opener_state = project(opener_events, library)
    opener_stage, opener_cands = candidates(opener_state, library)
    assert opener_stage == "opener"
    opener_fake = FakeRecommender("q.should.not.run", signals_asserted=["sig.script_echo"])
    opener_sel = _select(opener_fake, opener_state, opener_cands, library, stopped=False)
    assert opener_fake.calls == []
    assert list(opener_sel.signals_asserted) == []

    verify_events = events_from_steps(steps[:3])
    verify_state = project(verify_events, library)
    verify_stage, verify_cands = candidates(verify_state, library)
    assert verify_stage == "verify"
    verify_fake = FakeRecommender("q.should.not.run", signals_asserted=["sig.script_echo"])
    verify_sel = _select(verify_fake, verify_state, verify_cands, library, stopped=False)
    assert verify_fake.calls == []
    assert list(verify_sel.signals_asserted) == []

    probe_events = events_from_steps(steps[:4])
    probe_state = project(probe_events, library)
    probe_stage, probe_cands = candidates(probe_state, library)
    assert probe_stage == "probe"
    assert stop(probe_state, library, probe_cands) is None
    probe_fake = FakeRecommender(probe_cands[0], signals_asserted=["sig.script_echo"])
    probe_sel = _select(probe_fake, probe_state, probe_cands, library, stopped=False)
    assert probe_fake.calls, "recommender must run in the probe stage"
    assert list(probe_sel.signals_asserted) == []

    stop_events = events_from_steps(steps)
    stop_state = project(stop_events, library)
    stop_stage, stop_cands = candidates(stop_state, library)
    assert stop_stage == "probe"
    assert stop(stop_state, library, stop_cands) is not None
    stop_fake = FakeRecommender("q.should.not.run", signals_asserted=["sig.script_echo"])
    stop_sel = _select(stop_fake, stop_state, stop_cands, library, stopped=True)
    assert stop_fake.calls == []
    assert list(stop_sel.signals_asserted) == []
