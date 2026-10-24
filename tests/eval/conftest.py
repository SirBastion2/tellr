"""Eval-harness tests (A3). Root conftest belongs to A2; this file stays in tests/eval/."""

from __future__ import annotations

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
LIBRARY_DIR = ROOT / "library"


@pytest.fixture
def repo_root() -> Path:
    return ROOT


@pytest.fixture
def library_dir() -> Path:
    return LIBRARY_DIR
