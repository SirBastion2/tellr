"""SQLite store. Integrity is enforced by the database (architecture §10.1)."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path

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
    conn = sqlite3.connect(path)
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
