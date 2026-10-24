"""A-05 step 6: LocalLLM sends per-request grammar; HostedLLM uses the same validator."""

from __future__ import annotations

from pathlib import Path

from engine import load_library
from recommenders.grammar import gbnf_for
from recommenders.hosted_llm import HostedLLM
from recommenders.local_llm import LocalLLM
from recommenders.orchestrate import choose

ROOT = Path(__file__).resolve().parents[2]


class _Capture:
    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.calls: list[tuple[str, dict]] = []

    def __call__(self, url: str, body: dict) -> dict:
        self.calls.append((url, body))
        return self.payload


def _candidates(library):
    return [item for item in library.questions if item.role == "probe"]


def test_local_llm_sends_per_request_grammar() -> None:
    library = load_library(ROOT / "library")
    cands = _candidates(library)
    ids = [item.id for item in cands]
    capture = _Capture({"content": '{"next_question_id": "%s"}' % ids[0]})
    model = LocalLLM(
        library,
        server="http://127.0.0.1:8080",
        model_id="Meta-Llama-3.1-8B-Instruct-Q4_K_M",
        post=capture,
    )
    rec = model.next({"stated_purpose": "purpose.moving_money"}, cands)
    assert rec.next_question_id == ids[0]
    assert rec.signals_asserted == []
    assert capture.calls
    _url, body = capture.calls[0]
    assert body["grammar"] == gbnf_for(ids)
    assert body["temperature"] == 0
    assert "prompt" in body


def test_hosted_llm_uses_the_same_validator() -> None:
    library = load_library(ROOT / "library")
    cands = _candidates(library)
    capture = _Capture(
        {"choices": [{"message": {"content": '{"next_question_id": "q.invented.host"}'}}]}
    )
    model = HostedLLM(
        library,
        url="https://example.invalid/v1",
        model_id="hosted-test",
        post=capture,
    )
    choice = choose(
        model,
        {"stated_purpose": "purpose.moving_money"},
        cands,
        rule_id=cands[0].id,
        timeout_ms=1500,
        library_ids={item.id for item in library.questions},
    )
    assert choice.rejected is True
    assert choice.source == "rules"
    assert choice.question_id == cands[0].id
    assert choice.raw_value == "q.invented.host"
    assert choice.signals_asserted == []
