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
from engine import CommandRejected, export_library, load_library
from engine.testing import FakeEngine, ReplayError
from store import sqlite as store

_REPO = Path(__file__).resolve().parents[1]
_DEFAULT_LIBRARY = _REPO / "library"
_DEFAULT_DB = Path(os.environ.get("TELLER_DB", "/tmp/teller-copilot.sqlite"))


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


def create_app(
    *,
    db_path: Path | str | None = None,
    library_path: Path | str | None = None,
    recommender: str | None = None,
) -> FastAPI:
    db = Path(db_path) if db_path is not None else _DEFAULT_DB
    lib_path = Path(library_path) if library_path is not None else _DEFAULT_LIBRARY
    rec = recommender or os.environ.get("RECOMMENDER", "rules")
    model_id = os.environ.get("MODEL_ID") or None

    library = load_library(lib_path)
    engine = FakeEngine()
    conn = store.connect(db)
    if not store.initialized(conn):
        store.initialize(conn)

    app = FastAPI(title="Teller Copilot", version="1.0.0")
    app.state.db = conn
    app.state.library = library
    app.state.engine = engine
    app.state.recommender = rec
    app.state.model_id = model_id
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

    def project(session_id: str) -> dict[str, Any]:
        events = store.load_events(conn, session_id)
        try:
            state = dict(engine.project(events, library))
        except ReplayError:
            # FakeEngine keys on fixture mode (practice). Drop this when A-04 swaps the real fold.
            rewritten: list[dict[str, Any]] = []
            real_mode: str | None = None
            for event in events:
                if event.get("type") == "SessionOpened":
                    real_mode = event.get("mode")
                    rewritten.append({**event, "mode": "practice"})
                else:
                    rewritten.append(event)
            state = dict(engine.project(rewritten, library))
            if real_mode is not None:
                state["mode"] = real_mode
        return stamp(state, session_id)

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
        return {
            "recommender": rec,
            "model_id": model_id,
            "last_p95": None,
            "fallback_rate": 0.0,
            "agreement_rate": None,
        }

    @app.post("/sessions")
    def open_session(body: OpenBody) -> dict[str, Any]:
        command = {
            "type": "open",
            "mode": body.mode,
            "amount_band": body.amount_band,
            "scenario_id": body.scenario_id,
        }
        engine.check_command([], command, library)
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
        return project(session_id)

    @app.post("/sessions/{session_id}/context")
    def add_context(session_id: str, body: ContextBody) -> dict[str, Any]:
        require_session(session_id)
        events = store.load_events(conn, session_id)
        engine.check_command(events, {"type": "context", "chips": list(body.chips)}, library)
        store.append_event(
            conn,
            session_id,
            {"type": "ContextAdded", "ts": _timestamp(), "chips": list(body.chips)},
        )
        return project(session_id)

    @app.post("/sessions/{session_id}/answers")
    def add_answer(session_id: str, body: AnswerBody) -> dict[str, Any]:
        require_session(session_id)
        events = store.load_events(conn, session_id)
        engine.check_command(
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
        return project(session_id)

    @app.post("/sessions/{session_id}/undo")
    def undo(session_id: str) -> dict[str, Any]:
        require_session(session_id)
        events = store.load_events(conn, session_id)
        engine.check_command(events, {"type": "undo"}, library)
        teller = [
            event["seq"]
            for event in events
            if event.get("type") in ("ContextAdded", "AnswerRecorded")
        ]
        if teller:
            store.append_event(
                conn,
                session_id,
                {
                    "type": "Truncated",
                    "ts": _timestamp(),
                    "to_seq": teller[-1] - 1,
                    "actor": "teller",
                },
            )
        return project(session_id)

    @app.get("/sessions/{session_id}")
    def get_session(session_id: str) -> dict[str, Any]:
        require_session(session_id)
        return project(session_id)

    @app.post("/sessions/{session_id}/outcome")
    def record_outcome(session_id: str, body: OutcomeBody) -> dict[str, Any]:
        require_session(session_id)
        events = store.load_events(conn, session_id)
        engine.check_command(
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
        engine.check_command(store.load_events(conn, session_id), {"type": "close"}, library)
        store.append_event(conn, session_id, {"type": "SessionClosed", "ts": ts})
        store.close_session(conn, session_id, ts)
        return project(session_id)

    @app.get("/sessions/{session_id}/handoff")
    def handoff(session_id: str) -> dict[str, Any]:
        require_session(session_id)
        store.append_event(
            conn,
            session_id,
            {"type": "ManagerRequested", "ts": _timestamp()},
        )
        state = project(session_id)
        return {
            "session_id": session_id,
            "mode": state["mode"],
            "stated_purpose": state["stated_purpose"],
            "risk": state["risk"],
            "suggested_outcome": state["suggested_outcome"],
            "answers": state["answers"],
            "stop": state["stop"],
        }

    @app.get("/sessions")
    def list_sessions(
        mode: Literal["live", "practice", "all"] | None = Query(default=None),
    ) -> dict[str, list[dict[str, Any]]]:
        sessions = store.list_sessions(conn, mode=None if mode == "all" else mode)
        return {"sessions": sessions}

    return app


app = create_app()
