"""Put the repo root on sys.path until A2 owns pytest pythonpath."""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
_root = str(_ROOT)
if _root in sys.path:
    sys.path.remove(_root)
sys.path.insert(0, _root)
