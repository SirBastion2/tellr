"""CHANGE-005 (c): read-only GET /sessions/{id}/activity.

Rows are a projection of that session's stored events only. amount_band comes
from SessionOpened; channel and type come from live ContextAdded chips and the
event kind. No free text. Does not append, score, or call the recommender.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException

from store import sqlite as store

# Context chips carry the structured channel id. Other interview/model events
# are not a core-banking feed. SessionOpened supplies amount_band only.
_ROW_EVENT_TYPES = frozenset({"ContextAdded"})


def _live_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """0-based log order, matching api.main._live_indices / contract/events.md."""
    live: list[int] = []
    for seq, event in enumerate(events):
        if event.get("type") == "Truncated":
            to_seq = event.get("to_seq")
            if to_seq is None:
                continue
            live = [item for item in live if item <= int(to_seq)]
            continue
        live.append(seq)
    return [events[seq] for seq in live]


def project_activity(session_id: str, events: list[dict[str, Any]]) -> dict[str, Any]:
    """Build {session_id, rows} from stored events. Empty rows if nothing to project."""
    live = _live_events(events)
    opened = next((event for event in live if event.get("type") == "SessionOpened"), None)
    amount_band = str(opened.get("amount_band") or "") if opened is not None else ""
    rows: list[dict[str, str]] = []
    if amount_band:
        for event in live:
            kind = event.get("type")
            if kind not in _ROW_EVENT_TYPES:
                continue
            ts = event.get("ts")
            if not ts:
                continue
            chips = [str(chip) for chip in (event.get("chips") or ()) if chip]
            for chip in chips:
                rows.append(
                    {
                        "ts": str(ts),
                        "channel": chip,
                        "amount_band": amount_band,
                        "type": str(kind),
                    }
                )
    return {"session_id": session_id, "rows": rows}


def register_activity_routes(app: FastAPI, conn: Any) -> None:
    """Mount GET /sessions/{id}/activity without touching SessionState rendering."""

    @app.get("/sessions/{session_id}/activity")
    def get_activity(session_id: str) -> dict[str, Any]:
        if store.get_session(conn, session_id) is None:
            raise HTTPException(status_code=404, detail="session not found")
        return project_activity(session_id, store.load_events(conn, session_id))
