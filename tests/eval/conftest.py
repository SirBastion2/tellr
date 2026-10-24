"""Eval-harness tests (A3). Root conftest belongs to A2; this file stays in tests/eval/."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

DEV_DIR = ROOT / "eval" / "scenarios" / "dev"
LIBRARY_PATH = ROOT / "contract" / "library.json"


@pytest.fixture
def repo_root() -> Path:
    return ROOT


@pytest.fixture
def library_path() -> Path:
    return LIBRARY_PATH


@pytest.fixture
def dev_dir() -> Path:
    return DEV_DIR
