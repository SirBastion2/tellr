"""Store integrity tests from architecture §10.1."""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

import pytest

from store.sqlite import connect, initialize, purge


def _session(
    conn: sqlite3.Connection,
    session_id: str,
    *,
    mode: str = "practice",
    opened_at: str = "2026-01-01T00:00:00",
    closed_at: str | None = None,
    library_version: str = "lib-v1",
    account_ref: str | None = None,
    scenario_id: str | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO sessions (
            id, mode, opened_at, closed_at, library_version, account_ref, scenario_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (session_id, mode, opened_at, closed_at, library_version, account_ref, scenario_id),
    )
    conn.commit()


def _event(
    conn: sqlite3.Connection,
    session_id: str,
    seq: int = 1,
    *,
    ts: str = "2026-01-01T00:00:01",
    kind: str = "answer",
    payload: str = "{}",
) -> None:
    conn.execute(
        "INSERT INTO events (session_id, seq, ts, kind, payload) VALUES (?, ?, ?, ?, ?)",
        (session_id, seq, ts, kind, payload),
    )
    conn.commit()


def test_practice_session_with_scenario_is_accepted(db: sqlite3.Connection) -> None:
    _session(db, "s-practice", mode="practice", scenario_id="T1")
    row = db.execute("SELECT mode, scenario_id FROM sessions WHERE id = ?", ("s-practice",)).fetchone()
    assert tuple(row) == ("practice", "T1")


def test_live_session_without_scenario_is_accepted(db: sqlite3.Connection) -> None:
    _session(db, "s-live", mode="live", scenario_id=None)
    row = db.execute("SELECT mode, scenario_id FROM sessions WHERE id = ?", ("s-live",)).fetchone()
    assert tuple(row) == ("live", None)


def test_live_session_with_scenario_is_rejected(db: sqlite3.Connection) -> None:
    with pytest.raises(sqlite3.IntegrityError, match="CHECK"):
        _session(db, "s-live-scenario", mode="live", scenario_id="T1")


def test_orphan_event_is_rejected(db: sqlite3.Connection) -> None:
    with pytest.raises(sqlite3.IntegrityError, match="FOREIGN KEY"):
        _event(db, "does-not-exist")


def test_update_on_events_is_rejected(db: sqlite3.Connection) -> None:
    _session(db, "s-open")
    _event(db, "s-open")
    with pytest.raises(sqlite3.IntegrityError, match="events are append-only"):
        db.execute("UPDATE events SET payload = ? WHERE session_id = ?", ('{"rewritten": true}', "s-open"))
        db.commit()


def test_deleting_events_of_an_open_session_is_rejected(db: sqlite3.Connection) -> None:
    _session(db, "s-open", closed_at=None)
    _event(db, "s-open")
    with pytest.raises(sqlite3.IntegrityError, match="cannot delete events of an open session"):
        db.execute("DELETE FROM events WHERE session_id = ?", ("s-open",))
        db.commit()


def test_deleting_events_of_a_closed_session_is_allowed(db: sqlite3.Connection) -> None:
    _session(db, "s-closed", closed_at="2026-01-02T00:00:00", scenario_id="T1")
    _event(db, "s-closed")
    db.execute("DELETE FROM events WHERE session_id = ?", ("s-closed",))
    db.commit()
    assert db.execute("SELECT COUNT(*) FROM events").fetchone()[0] == 0


def test_session_first_delete_of_closed_session_is_rejected(db: sqlite3.Connection) -> None:
    _session(db, "s-closed", closed_at="2020-01-02T00:00:00", scenario_id="T1")
    _event(db, "s-closed")
    with pytest.raises(sqlite3.IntegrityError, match="FOREIGN KEY"):
        db.execute("DELETE FROM sessions WHERE id = ?", ("s-closed",))
        db.commit()
    db.rollback()
    assert db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 1
    assert db.execute("SELECT COUNT(*) FROM events").fetchone()[0] == 1


def test_purge_deletes_events_then_closed_sessions(db: sqlite3.Connection) -> None:
    _session(db, "s-old", opened_at="2020-01-01T00:00:00", closed_at="2020-01-02T00:00:00", scenario_id="T1")
    _event(db, "s-old")
    _session(db, "s-open", mode="live", opened_at="2020-01-01T00:00:00")
    _event(db, "s-open")
    _session(
        db,
        "s-recent",
        opened_at="2026-10-20T00:00:00",
        closed_at="2026-10-20T01:00:00",
        scenario_id="T2",
    )
    _event(db, "s-recent")

    purge(db, retention_days=7, now=datetime(2026, 10, 24))

    remaining = {row[0] for row in db.execute("SELECT id FROM sessions")}
    assert remaining == {"s-open", "s-recent"}
    assert db.execute("SELECT COUNT(*) FROM events WHERE session_id = 's-old'").fetchone()[0] == 0
    assert db.execute("SELECT COUNT(*) FROM events").fetchone()[0] == 2


def test_foreign_keys_pragma_is_on_for_every_connection(db_path: Path) -> None:
    first = connect(db_path)
    initialize(first)
    first.close()

    second = connect(db_path)
    try:
        assert second.execute("PRAGMA foreign_keys").fetchone()[0] == 1
        with pytest.raises(sqlite3.IntegrityError, match="FOREIGN KEY"):
            second.execute(
                "INSERT INTO events (session_id, seq, ts, kind, payload) VALUES (?, ?, ?, ?, ?)",
                ("missing", 1, "2026-01-01T00:00:01", "answer", "{}"),
            )
            second.commit()
    finally:
        second.close()
