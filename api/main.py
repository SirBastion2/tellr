"""Thin FastAPI command handler (architecture §4, §11; contract/api.md)."""

from __future__ import annotations

import os
import sqlite3
import tempfile
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.activity import register_activity_routes
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
from recommenders import DEFAULT_MODEL_ID, FakeRecommender, HostedLLM, LocalLLM, Metrics
from recommenders.select import (
    apply_recommendation,
    last_recommendation,
    needs_recommendation,
    select_question,
)
from store import sqlite as store

_MODEL_KINDS = frozenset({"local", "local_llm", "hosted", "hosted_llm"})
_FAKE_KINDS = frozenset({"fake", "fake_llm"})

_REPO = Path(__file__).resolve().parents[1]
_DEFAULT_LIBRARY = _REPO / "library"
_TELLER = frozenset({"ContextAdded", "AnswerRecorded"})


def default_db_path() -> Path:
    """SQLite path: TELLER_DB if set, else <tempdir>/teller-copilot.sqlite."""
    override = os.environ.get("TELLER_DB")
    if override:
        return Path(override)
    return Path(tempfile.gettempdir()) / "teller-copilot.sqlite"


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


def create_app(
    *,
    db_path: Path | str | None = None,
    library_path: Path | str | None = None,
    recommender: str | None = None,
    recommender_impl: object | None = None,
    metrics: Metrics | None = None,
    timeout_ms: int | None = None,
    strict_mode: bool | None = None,
    model_id: str | None = None,
    llama_server: str | None = None,
    hosted_url: str | None = None,
    warmup: bool | None = None,
    warmup_timeout_ms: int | None = None,
) -> FastAPI:
    db = Path(db_path) if db_path is not None else default_db_path()
    lib_path = Path(library_path) if library_path is not None else _DEFAULT_LIBRARY
    rec = recommender or os.environ.get("RECOMMENDER", "rules")
    if model_id is None:
        model_id = os.environ.get("MODEL_ID") or None
    if rec in _MODEL_KINDS and not model_id:
        model_id = DEFAULT_MODEL_ID
    if rec in _FAKE_KINDS and not model_id:
        model_id = FakeRecommender.MODEL_ID
    if timeout_ms is None:
        timeout_ms = int(os.environ.get("MODEL_TIMEOUT_MS", "1500"))
    if warmup_timeout_ms is None:
        warmup_timeout_ms = int(os.environ.get("MODEL_WARMUP_TIMEOUT_MS", "15000"))
    if strict_mode is None:
        strict_mode = os.environ.get("STRICT_MODE", "true").lower() not in {
            "0",
            "false",
            "no",
        }
    stats = metrics if metrics is not None else Metrics()

    library = load_library(lib_path)
    conn = store.connect(db)
    if not store.initialized(conn):
        store.initialize(conn)

    impl = recommender_impl
    if impl is None and rec in {"local", "local_llm"}:
        impl = LocalLLM(
            server=llama_server
            or os.environ.get("LLAMA_SERVER", "http://127.0.0.1:8080"),
            model_id=model_id,
            timeout_ms=timeout_ms,
            warmup_timeout_ms=warmup_timeout_ms,
            library=library,
        )
    elif impl is None and rec in {"hosted", "hosted_llm"}:
        url = hosted_url or os.environ.get("HOSTED_LLM_URL")
        if url:
            impl = HostedLLM(
                url=url,
                model_id=model_id,
                api_key=os.environ.get("HOSTED_LLM_API_KEY") or None,
                timeout_ms=timeout_ms,
                library=library,
            )
    elif impl is None and rec in _FAKE_KINDS:
        impl = FakeRecommender()

    do_warmup = warmup
    if do_warmup is None:
        do_warmup = rec in {"local", "local_llm"} and isinstance(impl, LocalLLM)
    else:
        do_warmup = bool(warmup) and isinstance(impl, LocalLLM)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        client = getattr(app.state, "recommender_impl", None)
        if getattr(app.state, "warmup", False) and isinstance(client, LocalLLM):
            client.warmup()
        yield

    app = FastAPI(title="Teller Copilot", version="1.0.0", lifespan=lifespan)
    # Vite (B) is a different origin than uvicorn; without this, the browser
    # blocks GET /library and POST /sessions, so Practice never starts and the
    # opener has no purpose chips (InterviewScreen waitingForPurpose).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.db = conn
    app.state.library = library
    app.state.recommender = rec
    app.state.model_id = model_id
    app.state.metrics = stats
    app.state.recommender_impl = impl
    app.state.warmup = do_warmup
    app.add_exception_handler(CommandRejected, rejected_response)

    def stamp(state: dict[str, Any], session_id: str) -> dict[str, Any]:
        out = dict(state)
        out["session_id"] = session_id
        out["debug"] = {
            "recommender": rec,
            "latency_ms": int((state.get("debug") or {}).get("latency_ms") or 0),
            "rejections": int((state.get("debug") or {}).get("rejections") or 0),
        }
        return out

    def render(session_id: str) -> dict[str, Any]:
        events = store.load_events(conn, session_id)
        state = project(events, library)
        # ROSTER §5.1: fold, candidates, stop; recommender only in probe (§7.4).
        stage, cands = candidates(state, library)
        stop_obj = stop(state, library, cands)
        if impl is None:
            if rec == "rules" and cands:
                rule_choice(cands)
            return stamp(public_state(state), session_id)

        if needs_recommendation(events):
            selection = select_question(
                impl,
                state,
                cands,
                library,
                stage=stage,
                stopped=stop_obj is not None,
                events=events,
                metrics=stats,
                timeout_ms=timeout_ms,
                strict=strict_mode,
                model_id=model_id,
            )
            for event in selection.events:
                store.append_event(conn, session_id, event)
            events = store.load_events(conn, session_id)

        state = apply_recommendation(state, events, library, stage)
        out = stamp(public_state(state), session_id)
        out["debug"]["rejections"] = sum(
            1 for event in events if event.get("type") == "ValidationRejected"
        )
        issued = last_recommendation(events)
        if issued and issued.get("latency_ms") is not None:
            out["debug"]["latency_ms"] = int(issued["latency_ms"])
        return out

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
        snap = stats.snapshot()
        return {
            "recommender": rec,
            "model_id": model_id,
            "p50": snap["p50"],
            "p95": snap["p95"],
            "last_p95": snap["p95"],
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
        sessions = store.list_sessions(conn, mode=mode)
        return {"sessions": sessions}

    register_activity_routes(app, conn)
    return app


app = create_app()
