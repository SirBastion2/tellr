"""Stage gate, timeout, validator, and fallback (architecture §7.4–§7.5, §8.3)."""

from __future__ import annotations

import time
from collections.abc import Mapping, Sequence
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FuturesTimeout
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal

from engine.library import Library
from engine.prompt import prompt_fields_from_session
from engine.rules import question_view, rule_choice
from recommenders.metrics import Metrics
from recommenders.validate import is_valid

_SKIP = frozenset(
    {"ValidationRejected", "QuestionAsked", "ModelSignal", "RecommendationIssued"}
)
_TURN = frozenset({"SessionOpened", "ContextAdded", "AnswerRecorded", "Truncated"})


@dataclass(frozen=True)
class Selection:
    question_id: str
    source: Literal["rules", "model"]
    signals_asserted: tuple[str, ...]
    latency_ms: int
    fallback: bool
    rejected: bool
    agreed: bool | None
    events: tuple[dict[str, Any], ...]


def _ids(candidates: Sequence[Any]) -> list[str]:
    return [item.id if hasattr(item, "id") else str(item) for item in candidates]


def _questions(library: Library, ids: Sequence[str]) -> list[Any]:
    by_id = {item.id: item for item in library.questions}
    return [by_id[qid] for qid in ids if qid in by_id]


def _timestamp() -> str:
    return datetime.now(UTC).replace(tzinfo=None).strftime("%Y-%m-%dT%H:%M:%S")


def _call_with_timeout(fn: Any, state: Any, questions: list[Any], timeout_ms: int) -> Any:
    pool = ThreadPoolExecutor(max_workers=1)
    try:
        future = pool.submit(fn, state, questions)
        return future.result(timeout=timeout_ms / 1000.0)
    finally:
        pool.shutdown(wait=False, cancel_futures=True)


def needs_recommendation(events: Sequence[Mapping[str, Any]]) -> bool:
    """True after a teller turn that does not yet have RecommendationIssued."""
    for event in reversed(events):
        kind = event.get("type")
        if kind == "RecommendationIssued":
            return False
        if kind in _SKIP:
            continue
        return kind in _TURN
    return False


def last_recommendation(events: Sequence[Mapping[str, Any]]) -> dict[str, Any] | None:
    for event in reversed(events):
        kind = event.get("type")
        if kind == "RecommendationIssued":
            return dict(event)
        if kind in _SKIP:
            continue
        return None
    return None


def apply_recommendation(
    state: Mapping[str, Any],
    events: Sequence[Mapping[str, Any]],
    library: Library,
    stage: str,
) -> dict[str, Any]:
    issued = last_recommendation(events)
    if issued is None or not issued.get("question_id"):
        return dict(state)
    stop = state.get("stop") or {}
    if stop.get("kind") == "hard":
        return dict(state)
    view = question_view(str(issued["question_id"]), stage, library)
    view["source"] = issued.get("source") or view["source"]
    out = dict(state)
    out["question"] = view
    return out


def select_question(
    recommender: Any,
    state: Mapping[str, Any],
    candidate_ids: Sequence[Any],
    library: Library,
    *,
    stage: str,
    stopped: bool,
    events: Sequence[Mapping[str, Any]] | None = None,
    metrics: Metrics | None = None,
    timeout_ms: int = 1500,
    strict: bool = True,
    model_id: str | None = None,
) -> Selection:
    ids = _ids(candidate_ids)
    rules_top = rule_choice(ids) if ids else ""

    if recommender is None or stage != "probe" or stopped or not ids:
        return Selection(
            question_id=rules_top,
            source="rules",
            signals_asserted=(),
            latency_ms=0,
            fallback=False,
            rejected=False,
            agreed=None,
            events=(),
        )

    questions = _questions(library, ids)
    prompt_state: dict[str, Any] = dict(state)
    if events is not None:
        prompt_state["_prompt"] = prompt_fields_from_session(
            state, events, library, ids
        )

    raw: str | None = None
    fallback = False
    rejected = False
    t0 = time.perf_counter()
    try:
        recommendation = _call_with_timeout(
            recommender.next, prompt_state, questions, timeout_ms
        )
        raw = str(recommendation.next_question_id)
        signals = () if strict else tuple(recommendation.signals_asserted)
    except (
        FuturesTimeout,
        TimeoutError,
        OSError,
        ValueError,
        TypeError,
        KeyError,
        AttributeError,
    ):
        fallback = True
        signals = ()
    latency_ms = max(0, round((time.perf_counter() - t0) * 1000))

    if fallback or raw is None:
        chosen = rules_top
        source: Literal["rules", "model"] = "rules"
        agreed: bool | None = None
    elif not is_valid(raw, ids, library):
        rejected = True
        chosen = rules_top
        source = "rules"
        agreed = raw == rules_top
    else:
        chosen = raw
        source = "model"
        agreed = raw == rules_top

    ts = _timestamp()
    issued_events: list[dict[str, Any]] = []
    if rejected:
        issued_events.append(
            {
                "type": "ValidationRejected",
                "ts": ts,
                "field": "next_question_id",
                "raw_value": raw,
            }
        )
    issued_events.append(
        {
            "type": "RecommendationIssued",
            "ts": ts,
            "question_id": chosen,
            "model_id": model_id,
            "latency_ms": latency_ms,
            "source": source,
        }
    )
    issued_events.append(
        {
            "type": "QuestionAsked",
            "ts": ts,
            "question_id": chosen,
            "stage": stage,
            "source": source,
        }
    )
    selection = Selection(
        question_id=chosen,
        source=source,
        signals_asserted=signals,
        latency_ms=latency_ms,
        fallback=fallback,
        rejected=rejected,
        agreed=agreed,
        events=tuple(issued_events),
    )
    if metrics is not None:
        metrics.record_attempt(
            latency_ms=latency_ms,
            fallback=fallback,
            rejected=rejected,
            agreed=agreed,
        )
    return selection
