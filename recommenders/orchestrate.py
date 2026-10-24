"""Timeout, validator, and rules fallback around any Recommender (§7.5, §8.3)."""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FuturesTimeout
from dataclasses import dataclass, field
from typing import Any

TELLER_FACTS = frozenset({"SessionOpened", "ContextAdded", "AnswerRecorded"})


@dataclass
class Choice:
    question_id: str
    source: str
    latency_ms: int
    rejected: bool
    fallback: bool
    raw_value: Any = None
    agreed: bool = False
    signals_asserted: list[str] = field(default_factory=list)


def candidate_ids(candidates: list[Any]) -> list[str]:
    ids: list[str] = []
    for item in candidates:
        if hasattr(item, "id"):
            ids.append(str(item.id))
        elif isinstance(item, dict):
            ids.append(str(item["id"]))
        else:
            ids.append(str(item))
    return ids


def live_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    live: list[tuple[int, dict[str, Any]]] = []
    for seq, event in enumerate(events):
        if event.get("type") == "Truncated":
            to_seq = event.get("to_seq")
            if to_seq is None:
                continue
            live = [item for item in live if item[0] <= int(to_seq)]
            continue
        live.append((seq, event))
    return [event for _seq, event in live]


def turn_decision(events: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, bool]:
    """Most recent RecommendationIssued / ValidationRejected after the last teller fact."""
    issued: dict[str, Any] | None = None
    rejected = False
    for event in reversed(live_events(events)):
        kind = event.get("type")
        if kind in TELLER_FACTS:
            break
        if kind == "RecommendationIssued":
            issued = event
        elif kind == "ValidationRejected":
            rejected = True
    return issued, rejected


def extract_fields(
    state: dict[str, Any], events: list[dict[str, Any]], candidates: list[Any]
) -> dict[str, Any]:
    chips: list[str] = []
    transcript: list[tuple[str, str]] = []
    for event in live_events(events):
        if event.get("type") == "ContextAdded":
            chips.extend(event.get("chips") or [])
        elif event.get("type") == "AnswerRecorded":
            transcript.append((str(event["question_id"]), str(event["chip"])))
    pattern = (state.get("risk") or {}).get("pattern")
    engine = state.get("_engine") or {}
    views: list[dict[str, str]] = []
    for item in candidates:
        if hasattr(item, "id"):
            views.append({"id": str(item.id), "why": str(getattr(item, "why", "") or "")})
        elif isinstance(item, dict):
            views.append({"id": str(item["id"]), "why": str(item.get("why") or "")})
        else:
            views.append({"id": str(item), "why": ""})
    return {
        "context_chips": chips,
        "stated_purpose": state.get("stated_purpose"),
        "transcript": transcript,
        "evidence_ids": list(engine.get("evidence") or []),
        "leading_pattern": pattern.get("id") if pattern else None,
        "candidates": views,
    }


def _call(fn, timeout_ms: int | None) -> Any:
    if timeout_ms is None:
        return fn()
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(fn)
        try:
            return future.result(timeout=timeout_ms / 1000)
        except FuturesTimeout as exc:
            raise TimeoutError from exc


def choose(
    recommender: Any,
    state: Any,
    candidates: list[Any],
    *,
    rule_id: str,
    timeout_ms: int | None = 1500,
    library_ids: set[str] | None = None,
) -> Choice:
    started = time.perf_counter()
    try:
        rec = _call(lambda: recommender.next(state, candidates), timeout_ms)
    except TimeoutError:
        latency = int((time.perf_counter() - started) * 1000)
        return Choice(rule_id, "rules", latency, rejected=False, fallback=True)
    latency = int((time.perf_counter() - started) * 1000)
    qid = getattr(rec, "next_question_id", None)
    allowed = set(candidate_ids(candidates))
    if library_ids is not None:
        allowed &= set(library_ids)
    if qid not in allowed:
        return Choice(
            rule_id, "rules", latency, rejected=True, fallback=False, raw_value=qid
        )
    return Choice(
        str(qid),
        "model",
        latency,
        rejected=False,
        fallback=False,
        agreed=str(qid) == rule_id,
        signals_asserted=[],
    )
