"""SQLite store. Integrity is enforced by the database (architecture §10.1)."""

from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

# Architecture §10.1, verbatim.
SCHEMA_SQL = """
PRAGMA foreign_keys = ON;   -- per connection; without it SQLite ignores REFERENCES

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                 -- uuid4
  mode TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  library_version TEXT NOT NULL,       -- pins the fold
  account_ref TEXT,                    -- optional, policy-gated, never modelled
  scenario_id TEXT,                    -- practice only
  CHECK (mode IN ('live','practice')),
  CHECK (mode <> 'live' OR scenario_id IS NULL)       -- D8
);
CREATE TABLE events (
  session_id TEXT NOT NULL REFERENCES sessions(id),
  seq INTEGER NOT NULL,
  ts TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,               -- JSON
  PRIMARY KEY (session_id, seq)
);
CREATE TRIGGER events_no_update BEFORE UPDATE ON events
  BEGIN SELECT RAISE(ABORT, 'events are append-only'); END;
CREATE TRIGGER events_no_partial_delete BEFORE DELETE ON events
  WHEN (SELECT closed_at FROM sessions WHERE id = OLD.session_id) IS NULL
  BEGIN SELECT RAISE(ABORT, 'cannot delete events of an open session'); END;
"""


def connect(path: str | Path) -> sqlite3.Connection:
    """Open a connection and enable foreign keys. Call this for every connection."""
    # check_same_thread=False: FastAPI runs sync routes in a worker thread.
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def initialize(conn: sqlite3.Connection) -> None:
    """Apply the §10.1 schema and triggers."""
    conn.executescript(SCHEMA_SQL)


def purge(
    conn: sqlite3.Connection,
    retention_days: int,
    *,
    now: datetime | None = None,
) -> None:
    """Delete closed sessions past the retention window, events first, one transaction."""
    if now is None:
        now = datetime.now(UTC).replace(tzinfo=None)
    elif now.tzinfo is not None:
        now = now.astimezone(UTC).replace(tzinfo=None)
    cutoff = (now - timedelta(days=retention_days)).strftime("%Y-%m-%dT%H:%M:%S")
    with conn:
        conn.execute(
            """
            DELETE FROM events
            WHERE session_id IN (
              SELECT id FROM sessions
              WHERE closed_at IS NOT NULL AND closed_at < ?
            )
            """,
            (cutoff,),
        )
        conn.execute(
            """
            DELETE FROM sessions
            WHERE closed_at IS NOT NULL AND closed_at < ?
            """,
            (cutoff,),
        )


def initialized(conn: sqlite3.Connection) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sessions'"
    ).fetchone()
    return row is not None


def create_session(
    conn: sqlite3.Connection,
    session_id: str,
    *,
    mode: str,
    opened_at: str,
    library_version: str,
    scenario_id: str | None = None,
) -> None:
    with conn:
        conn.execute(
            """
            INSERT INTO sessions (
                id, mode, opened_at, closed_at, library_version, account_ref, scenario_id
            ) VALUES (?, ?, ?, NULL, ?, NULL, ?)
            """,
            (session_id, mode, opened_at, library_version, scenario_id),
        )


def close_session(conn: sqlite3.Connection, session_id: str, closed_at: str) -> None:
    with conn:
        conn.execute(
            "UPDATE sessions SET closed_at = ? WHERE id = ?",
            (closed_at, session_id),
        )


def get_session(conn: sqlite3.Connection, session_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        """
        SELECT id, mode, opened_at, closed_at, library_version, scenario_id
        FROM sessions WHERE id = ?
        """,
        (session_id,),
    ).fetchone()
    if row is None:
        return None
    return {
        "id": row[0],
        "mode": row[1],
        "opened_at": row[2],
        "closed_at": row[3],
        "library_version": row[4],
        "scenario_id": row[5],
    }


def list_sessions(
    conn: sqlite3.Connection, *, mode: str | None = None
) -> list[dict[str, Any]]:
    sql = """
        SELECT id, mode, opened_at, closed_at, library_version
        FROM sessions
    """
    params: tuple[str, ...] = ()
    if mode is None or mode == "live":
        sql += " WHERE mode = 'live'"
    elif mode == "practice":
        sql += " WHERE mode = 'practice'"
    # mode == "all": no filter (live + practice). §11.1 excludes practice by default.
    sql += " ORDER BY opened_at DESC"
    rows = conn.execute(sql, params).fetchall()
    return [
        {
            "session_id": row[0],
            "mode": row[1],
            "opened_at": row[2],
            "closed_at": row[3],
            "library_version": row[4],
        }
        for row in rows
    ]


def next_seq(conn: sqlite3.Connection, session_id: str) -> int:
    row = conn.execute(
        "SELECT COALESCE(MAX(seq), 0) FROM events WHERE session_id = ?",
        (session_id,),
    ).fetchone()
    return int(row[0]) + 1


def append_event(
    conn: sqlite3.Connection, session_id: str, event: dict[str, Any]
) -> int:
    seq = next_seq(conn, session_id)
    ts = str(event.get("ts") or "")
    kind = str(event["type"])
    with conn:
        conn.execute(
            "INSERT INTO events (session_id, seq, ts, kind, payload) VALUES (?, ?, ?, ?, ?)",
            (session_id, seq, ts, kind, json.dumps(event)),
        )
    return seq


def load_events(conn: sqlite3.Connection, session_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT seq, ts, kind, payload FROM events WHERE session_id = ? ORDER BY seq",
        (session_id,),
    ).fetchall()
    events: list[dict[str, Any]] = []
    for seq, ts, kind, payload in rows:
        event = json.loads(payload)
        event.setdefault("type", kind)
        event["seq"] = seq
        event.setdefault("ts", ts)
        events.append(event)
    return events
