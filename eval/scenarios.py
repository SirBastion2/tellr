"""Load §13.1 scenario YAML. Held-out paths are labelled, not refused (A-08)."""

from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path
from typing import Any

import yaml

from eval.types import Scenario

HELD_OUT = "heldout"


def is_heldout_path(path: Path) -> bool:
    """True when any path component is 'heldout' (real set or a tmp stand-in)."""
    return HELD_OUT in path.resolve().parts


def parse_scenario(data: Mapping[str, Any]) -> Scenario:
    chips = data.get("context_chips") or []
    answers = data.get("answers") or {}
    tags = data.get("tags") or []
    return Scenario(
        id=str(data["id"]),
        label=str(data["label"]),
        population=str(data["population"]),
        pattern_truth=data.get("pattern_truth"),
        stated_purpose=str(data["stated_purpose"]),
        context_chips=tuple(str(c) for c in chips),
        answers={str(k): str(v) for k, v in dict(answers).items()},
        default=str(data.get("default") or "vague"),
        tags=tuple(str(t) for t in tags),
        source=None if data.get("source") is None else str(data["source"]),
    )


def load_scenarios(target: Path) -> list[Scenario]:
    if target.is_file():
        files = [target]
    else:
        files = sorted(target.glob("*.yaml")) + sorted(target.glob("*.yml"))
    if not files:
        raise SystemExit(f"no scenario YAML under {target}")
    loaded: list[Scenario] = []
    for path in files:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        items = raw if isinstance(raw, list) else [raw]
        for item in items:
            if not isinstance(item, dict):
                raise SystemExit(f"{path}: scenario must be a mapping")
            loaded.append(parse_scenario(item))
    loaded.sort(key=lambda s: s.id)
    return loaded
