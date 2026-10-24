"""A-05 step 6: LocalLLM sends a per-request grammar; HostedLLM shares the validator."""

from __future__ import annotations

from tests.recommenders.conftest import events_from_steps, t2_steps

from engine import candidates, project, rule_choice
from engine.library import Library


def test_local_llm_sends_per_request_grammar(library: Library, monkeypatch) -> None:
    from recommenders import local_llm
    from recommenders.local_llm import LocalLLM

    captured: dict = {}

    def fake_post(url: str, body: dict, **kwargs: object) -> dict:
        captured["url"] = url
        captured["body"] = body
        return {"content": '{"next_question_id": "q.secrecy.told_not_to_tell"}'}

    monkeypatch.setattr(local_llm, "post_json", fake_post)
    questions = [item for item in library.questions if item.role != "opener"]
    llm = LocalLLM(server="http://127.0.0.1:8080", library=library)
    recommendation = llm.next(
        {
            "_prompt": {
                "context_chips": ["chip.cash_only"],
                "stated_purpose": "purpose.moving_money",
                "transcript": [("q.purpose.open", "specific")],
                "evidence_ids": ["sig.cash_insistence"],
                "leading_pattern": None,
                "candidates": [(item.id, item.why) for item in questions],
                "answer_chip_vocabulary": [],
                "purpose_vocabulary": [],
            }
        },
        questions,
    )
    assert recommendation.next_question_id == "q.secrecy.told_not_to_tell"
    assert recommendation.signals_asserted == []
    assert captured["url"] == "http://127.0.0.1:8080/completion"
    grammar = captured["body"]["grammar"]
    for item in questions:
        assert item.id in grammar
    assert captured["body"]["temperature"] == 0
    assert "q.purpose.open" not in grammar


def test_hosted_llm_uses_same_validator(library: Library, monkeypatch) -> None:
    from recommenders import hosted_llm
    from recommenders.hosted_llm import HostedLLM
    from recommenders.metrics import Metrics
    from recommenders.select import select_question

    def fake_post(url: str, body: dict, **kwargs: object) -> dict:
        return {
            "choices": [
                {"message": {"content": '{"next_question_id": "q.invented.hosted"}'}}
            ]
        }

    monkeypatch.setattr(hosted_llm, "post_json", fake_post)
    events = events_from_steps(t2_steps()[:4])
    state = project(events, library)
    stage, cands = candidates(state, library)
    assert stage == "probe"
    hosted = HostedLLM(url="https://example.test", model_id="hosted-test", library=library)
    selection = select_question(
        hosted,
        state,
        cands,
        library,
        stage=stage,
        stopped=False,
        events=events,
        metrics=Metrics(),
        model_id="hosted-test",
    )
    assert selection.rejected is True
    assert selection.question_id == rule_choice(cands)
    assert selection.source == "rules"
    assert any(event["type"] == "ValidationRejected" for event in selection.events)
    assert any(event.get("raw_value") == "q.invented.hosted" for event in selection.events)
