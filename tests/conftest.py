"""Shared pytest fixtures. Owned by A2 (docs/ROSTER.md §3)."""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from pathlib import Path

import pytest


@pytest.fixture
def db_path(tmp_path: Path) -> Path:
    return tmp_path / "teller.sqlite"


@pytest.fixture
def db(db_path: Path) -> Iterator[sqlite3.Connection]:
    from store.sqlite import connect, initialize

    conn = connect(db_path)
    initialize(conn)
    try:
        yield conn
    finally:
        conn.close()
