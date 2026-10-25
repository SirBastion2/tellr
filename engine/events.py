"""Session event types (architecture §4). Facts only; no SignalAsserted / SignalCleared (D12)."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, fields
from typing import Any, Literal

Outcome = Literal["Proceed", "SlowDown", "Escalate", "Report"]
Mode = Literal["live", "practice"]
Source = Literal["fixed", "rules", "model"]
Stage = Literal["opener", "verify", "probe"]


@dataclass(frozen=True)
class SessionOpened:
    ts: Any = None
    mode: Mode | None = None
    amount_band: str | None = None
    library_version: str | None = None


@dataclass(frozen=True)
class ContextAdded:
    ts: Any = None
    chips: tuple[str, ...] = ()
    source: str | None = None


@dataclass(frozen=True)
class QuestionAsked:
    ts: Any = None
    question_id: str | None = None
    stage: Stage | None = None
    source: Source | None = None


@dataclass(frozen=True)
class AnswerRecorded:
    ts: Any = None
    question_id: str | None = None
    chip: str | None = None
    purpose: str | None = None
    note: str | None = None


@dataclass(frozen=True)
class ModelSignal:
    ts: Any = None
    signal_id: str | None = None
    model_id: str | None = None


@dataclass(frozen=True)
class RecommendationIssued:
    ts: Any = None
    question_id: str | None = None
    model_id: str | None = None
    latency_ms: int | None = None
    source: Source | None = None


@dataclass(frozen=True)
class ValidationRejected:
    ts: Any = None
    field: str | None = None
    raw_value: Any = None


@dataclass(frozen=True)
class Truncated:
    ts: Any = None
    to_seq: int | None = None
    actor: str | None = None


@dataclass(frozen=True)
class ManagerRequested:
    ts: Any = None


@dataclass(frozen=True)
class OutcomeRecorded:
    ts: Any = None
    outcome: Outcome | str | None = None
    actor: str | None = None
    note: str | None = None


@dataclass(frozen=True)
class SessionClosed:
    ts: Any = None


@dataclass(frozen=True)
class UnknownEvent:
    kind: str
    raw: Any = None


Event = (
    SessionOpened
    | ContextAdded
    | QuestionAsked
    | AnswerRecorded
    | ModelSignal
    | RecommendationIssued
    | ValidationRejected
    | Truncated
    | ManagerRequested
    | OutcomeRecorded
    | SessionClosed
    | UnknownEvent
)

_TYPES: dict[str, type] = {
    "SessionOpened": SessionOpened,
    "ContextAdded": ContextAdded,
    "QuestionAsked": QuestionAsked,
    "AnswerRecorded": AnswerRecorded,
    "ModelSignal": ModelSignal,
    "RecommendationIssued": RecommendationIssued,
    "ValidationRejected": ValidationRejected,
    "Truncated": Truncated,
    "ManagerRequested": ManagerRequested,
    "OutcomeRecorded": OutcomeRecorded,
    "SessionClosed": SessionClosed,
}


def parse_event(raw: Any) -> Event:
    """Turn a mapping or dataclass into a frozen event. Unknown kinds become UnknownEvent."""
    if isinstance(raw, (SessionOpened, ContextAdded, QuestionAsked, AnswerRecorded, ModelSignal,
                        RecommendationIssued, ValidationRejected, Truncated, ManagerRequested,
                        OutcomeRecorded, SessionClosed, UnknownEvent)):
        return raw
    if not isinstance(raw, Mapping):
        return UnknownEvent(kind=type(raw).__name__, raw=raw)
    kind = raw.get("type") or raw.get("kind")
    cls = _TYPES.get(str(kind)) if kind is not None else None
    if cls is None:
        return UnknownEvent(kind=str(kind), raw=dict(raw))
    allowed = {item.name for item in fields(cls)}
    payload = {key: raw[key] for key in allowed if key in raw}
    if cls is ContextAdded and "chips" in payload:
        chips = payload["chips"]
        payload["chips"] = tuple(chips) if chips is not None else ()
    if cls is Truncated and "to_seq" in payload:
        try:
            payload["to_seq"] = int(payload["to_seq"])
        except (TypeError, ValueError):
            payload["to_seq"] = None
    try:
        return cls(**payload)
    except TypeError:
        return UnknownEvent(kind=str(kind), raw=dict(raw))
