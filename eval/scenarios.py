"""Load §13.1 scenario YAML. Refuses held-out paths (architecture §13.4)."""

from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path
from typing import Any

import yaml

from eval.types import Scenario

HELD_OUT = "heldout"


def refuse_heldout(path: Path) -> None:
    resolved = path.resolve()
    if HELD_OUT in resolved.parts:
        raise SystemExit(
            "refusing to run on held-out scenarios (architecture §13.4 / card A-06)"
        )


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
    refuse_heldout(target)
    if target.is_file():
        files = [target]
    else:
        files = sorted(target.glob("*.yaml")) + sorted(target.glob("*.yml"))
    if not files:
        raise SystemExit(f"no scenario YAML under {target}")
    loaded: list[Scenario] = []
    for path in files:
        refuse_heldout(path)
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        items = raw if isinstance(raw, list) else [raw]
        for item in items:
            if not isinstance(item, dict):
                raise SystemExit(f"{path}: scenario must be a mapping")
            loaded.append(parse_scenario(item))
    loaded.sort(key=lambda s: s.id)
    return loaded
