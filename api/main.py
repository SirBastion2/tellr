"""Thin FastAPI command handler (architecture §4, §11; contract/api.md)."""

from __future__ import annotations

import os
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from api.errors import rejected_response
from engine import (
    CommandRejected,
    candidates,
    check_command,
    export_library,
    load_library,
    project,
    public_state,
    rule_choice,
    stop,
)
from engine.rules import question_view
from recommenders import DEFAULT_MODEL_ID, MODEL_NAMES, build_recommender
from recommenders.metrics import Metrics
from recommenders.orchestrate import choose, extract_fields, live_events, turn_decision
from store import sqlite as store

_REPO = Path(__file__).resolve().parents[1]
_DEFAULT_LIBRARY = _REPO / "library"
_DEFAULT_DB = Path(os.environ.get("TELLER_DB", "/tmp/teller-copilot.sqlite"))
_TELLER = frozenset({"ContextAdded", "AnswerRecorded"})


class OpenBody(BaseModel):
    mode: Literal["live", "practice"]
    amount_band: str
    scenario_id: str | None = None


class ContextBody(BaseModel):
    chips: list[str]


class AnswerBody(BaseModel):
    question_id: str
    chip: str
    purpose: str | None = None
    note: str | None = None


class OutcomeBody(BaseModel):
    outcome: str
    actor: str | None = None
    note: str | None = None


def _timestamp() -> str:
    return datetime.now(UTC).replace(tzinfo=None).strftime("%Y-%m-%dT%H:%M:%S")


def _live_indices(events: list[dict[str, Any]]) -> list[int]:
    """0-based log order, matching engine.reduce._live_events (contract/events.md)."""
    live: list[int] = []
    for seq, event in enumerate(events):
        if event.get("type") == "Truncated":
            to_seq = event.get("to_seq")
            if to_seq is None:
                continue
            live = [item for item in live if item <= int(to_seq)]
            continue
        live.append(seq)
    return live


def _undo_to_seq(events: list[dict[str, Any]]) -> int | None:
    """Pop the most recent live teller action (§4). to_seq is 0-based log order."""
    live = _live_indices(events)
    teller = [seq for seq in live if events[seq].get("type") in _TELLER]
    if not teller:
        return None
    return teller[-1] - 1


def _rejection_count(events: list[dict[str, Any]]) -> int:
    return sum(1 for event in live_events(events) if event.get("type") == "ValidationRejected")


def create_app(
    *,
    db_path: Path | str | None = None,
    library_path: Path | str | None = None,
    recommender: str | None = None,
    recommender_impl: Any = None,
    model_id: str | None = None,
    timeout_ms: int | None = None,
) -> FastAPI:
    db = Path(db_path) if db_path is not None else _DEFAULT_DB
    lib_path = Path(library_path) if library_path is not None else _DEFAULT_LIBRARY
    rec = recommender or os.environ.get("RECOMMENDER", "rules")
    if model_id is None:
        env_model = os.environ.get("MODEL_ID") or None
        model_id = env_model or (DEFAULT_MODEL_ID if rec in MODEL_NAMES else None)
    if timeout_ms is None:
        timeout_ms = int(os.environ.get("MODEL_TIMEOUT_MS", "1500"))

    library = load_library(lib_path)
    conn = store.connect(db)
    if not store.initialized(conn):
        store.initialize(conn)

    impl = build_recommender(rec, library=library, model_id=model_id, impl=recommender_impl)
    metrics = Metrics()

    app = FastAPI(title="Teller Copilot", version="1.0.0")
    app.state.db = conn
    app.state.library = library
    app.state.recommender = rec
    app.state.model_id = model_id
    app.state.recommender_impl = impl
    app.state.metrics = metrics
    app.add_exception_handler(CommandRejected, rejected_response)

    def stamp(
        state: dict[str, Any], session_id: str, latency_ms: int, rejections: int
    ) -> dict[str, Any]:
        out = dict(state)
        out["session_id"] = session_id
        out["debug"] = {
            "recommender": rec,
            "latency_ms": int(latency_ms),
            "rejections": int(rejections),
        }
        return out

    def _apply_model_question(state: dict[str, Any], question_id: str, stage: str) -> dict[str, Any]:
        if state.get("question") is None:
            return state
        updated = dict(state)
        updated["question"] = question_view(question_id, stage, library)
        updated["question"]["source"] = "model"
        return updated

    def render(session_id: str) -> dict[str, Any]:
        events = store.load_events(conn, session_id)
        state = project(events, library)
        # ROSTER §5.1: fold, then candidates/stop; recommender only in probe, never after stop.
        stage, cands = candidates(state, library)
        stop_obj = stop(state, library, cands)
        if rec == "rules" or impl is None:
            if cands:
                rule_choice(cands)
            return stamp(public_state(state), session_id, 0, _rejection_count(events))

        issued, rejected_turn = turn_decision(events)
        latency = int(issued.get("latency_ms") or 0) if issued else 0
        if issued and issued.get("source") == "model" and issued.get("question_id"):
            state = _apply_model_question(state, str(issued["question_id"]), stage)
        elif (
            stage == "probe"
            and stop_obj is None
            and cands
            and issued is None
            and not rejected_turn
        ):
            rule_id = rule_choice(cands)
            by_id = {item.id: item for item in library.questions}
            questions = [by_id[item] for item in cands if item in by_id]
            fields = extract_fields(state, events, questions)
            prompt_state = {**dict(state), **fields}
            choice = choose(
                impl,
                prompt_state,
                questions,
                rule_id=rule_id,
                timeout_ms=timeout_ms,
                library_ids={item.id for item in library.questions},
            )
            metrics.record(choice)
            latency = choice.latency_ms
            ts = _timestamp()
            if choice.rejected:
                store.append_event(
                    conn,
                    session_id,
                    {
                        "type": "ValidationRejected",
                        "ts": ts,
                        "field": "next_question_id",
                        "raw_value": choice.raw_value,
                    },
                )
            else:
                store.append_event(
                    conn,
                    session_id,
                    {
                        "type": "RecommendationIssued",
                        "ts": ts,
                        "question_id": choice.question_id,
                        "model_id": model_id,
                        "latency_ms": choice.latency_ms,
                        "source": choice.source,
                    },
                )
                if choice.source == "model":
                    state = _apply_model_question(state, choice.question_id, stage)
            events = store.load_events(conn, session_id)
        return stamp(public_state(state), session_id, latency, _rejection_count(events))

    def require_session(session_id: str) -> dict[str, Any]:
        row = store.get_session(conn, session_id)
        if row is None:
            raise HTTPException(status_code=404, detail="session not found")
        return row

    @app.get("/library")
    def get_library() -> dict[str, object]:
        return export_library(library)

    @app.get("/health")
    def health() -> dict[str, object]:
        snap = metrics.snapshot()
        return {
            "recommender": rec,
            "model_id": model_id,
            "p50": snap["p50"],
            "p95": snap["p95"],
            "last_p95": snap["last_p95"],
            "fallback_rate": snap["fallback_rate"],
            "rejection_count": snap["rejection_count"],
            "agreement_rate": snap["agreement_rate"],
        }

    @app.post("/sessions")
    def open_session(body: OpenBody) -> dict[str, Any]:
        command = {
            "type": "open",
            "mode": body.mode,
            "amount_band": body.amount_band,
            "scenario_id": body.scenario_id,
        }
        check_command([], command, library)
        session_id = str(uuid.uuid4())
        ts = _timestamp()
        try:
            store.create_session(
                conn,
                session_id,
                mode=body.mode,
                opened_at=ts,
                library_version=library.library_version,
                scenario_id=body.scenario_id,
            )
        except sqlite3.IntegrityError as exc:
            raise CommandRejected(
                "scenario_on_live_session", "live sessions cannot carry a scenario"
            ) from exc
        store.append_event(
            conn,
            session_id,
            {
                "type": "SessionOpened",
                "ts": ts,
                "mode": body.mode,
                "amount_band": body.amount_band,
                "library_version": library.library_version,
            },
        )
        return render(session_id)

    @app.post("/sessions/{session_id}/context")
    def add_context(session_id: str, body: ContextBody) -> dict[str, Any]:
        require_session(session_id)
        events = store.load_events(conn, session_id)
        check_command(events, {"type": "context", "chips": list(body.chips)}, library)
        store.append_event(
            conn,
            session_id,
            {"type": "ContextAdded", "ts": _timestamp(), "chips": list(body.chips)},
        )
        return render(session_id)

    @app.post("/sessions/{session_id}/answers")
    def add_answer(session_id: str, body: AnswerBody) -> dict[str, Any]:
        require_session(session_id)
        events = store.load_events(conn, session_id)
        check_command(
            events,
            {
                "type": "answer",
                "question_id": body.question_id,
                "chip": body.chip,
                "purpose": body.purpose,
                "note": body.note,
            },
            library,
        )
        store.append_event(
            conn,
            session_id,
            {
                "type": "AnswerRecorded",
                "ts": _timestamp(),
                "question_id": body.question_id,
                "chip": body.chip,
                "purpose": body.purpose,
                "note": body.note,
            },
        )
        return render(session_id)

    @app.post("/sessions/{session_id}/undo")
    def undo(session_id: str) -> dict[str, Any]:
        require_session(session_id)
        events = store.load_events(conn, session_id)
        check_command(events, {"type": "undo"}, library)
        to_seq = _undo_to_seq(events)
        if to_seq is not None:
            store.append_event(
                conn,
                session_id,
                {
                    "type": "Truncated",
                    "ts": _timestamp(),
                    "to_seq": to_seq,
                    "actor": "teller",
                },
            )
        return render(session_id)

    @app.get("/sessions/{session_id}")
    def get_session(session_id: str) -> dict[str, Any]:
        require_session(session_id)
        return render(session_id)

    @app.post("/sessions/{session_id}/outcome")
    def record_outcome(session_id: str, body: OutcomeBody) -> dict[str, Any]:
        require_session(session_id)
        events = store.load_events(conn, session_id)
        check_command(
            events,
            {
                "type": "outcome",
                "outcome": body.outcome,
                "actor": body.actor,
                "note": body.note,
            },
            library,
        )
        ts = _timestamp()
        store.append_event(
            conn,
            session_id,
            {
                "type": "OutcomeRecorded",
                "ts": ts,
                "outcome": body.outcome,
                "actor": body.actor,
                "note": body.note,
            },
        )
        check_command(store.load_events(conn, session_id), {"type": "close"}, library)
        store.append_event(conn, session_id, {"type": "SessionClosed", "ts": ts})
        store.close_session(conn, session_id, ts)
        return render(session_id)

    @app.get("/sessions/{session_id}/handoff")
    def handoff(session_id: str) -> dict[str, Any]:
        require_session(session_id)
        store.append_event(
            conn,
            session_id,
            {"type": "ManagerRequested", "ts": _timestamp()},
        )
        events = store.load_events(conn, session_id)
        recorded = next(
            (
                event
                for event in reversed(events)
                if event.get("type") == "OutcomeRecorded"
            ),
            None,
        )
        state = render(session_id)
        return {
            "session_id": session_id,
            "mode": state["mode"],
            "stated_purpose": state["stated_purpose"],
            "risk": state["risk"],
            "suggested_outcome": state["suggested_outcome"],
            "answers": state["answers"],
            "stop": state["stop"],
            "outcome": recorded.get("outcome") if recorded is not None else None,
            "actor": recorded.get("actor") if recorded is not None else None,
        }

    @app.get("/sessions")
    def list_sessions(
        mode: Literal["live", "practice", "all"] | None = Query(default=None),
    ) -> dict[str, list[dict[str, Any]]]:
        sessions = store.list_sessions(conn, mode=None if mode == "all" else mode)
        return {"sessions": sessions}

    return app


app = create_app()
