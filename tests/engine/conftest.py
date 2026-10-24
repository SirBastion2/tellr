"""Keep the real `engine` package ahead of this tests/engine/ directory."""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
_root = str(_ROOT)
if _root in sys.path:
    sys.path.remove(_root)
sys.path.insert(0, _root)
_tests = str(_ROOT / "tests")
if _tests in sys.path:
    sys.path.remove(_tests)
