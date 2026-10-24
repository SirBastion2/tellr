"""Shared eval result types."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class Scenario:
    id: str
    label: str
    population: str
    pattern_truth: str | None
    stated_purpose: str
    context_chips: tuple[str, ...]
    answers: Mapping[str, str]
    default: str
    tags: tuple[str, ...] = ()
    source: str | None = None


@dataclass(frozen=True)
class ArmResult:
    scenario_id: str
    population: str
    label: str
    raw_level: str
    score: int | None
    questions: int
    asked: tuple[str, ...]
    default_fired: int
    validator_rejections: int
    concerning_count: int | None = None
    trace: tuple[Mapping[str, Any], ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        object.__setattr__(self, "asked", tuple(self.asked))
        object.__setattr__(self, "trace", tuple(dict(step) for step in self.trace))


LEVELS = ("Clear", "Caution", "High")


def normalize_level(raw: str) -> str:
    key = raw.strip().lower().replace(" concern", "")
    mapping = {"clear": "Clear", "caution": "Caution", "high": "High"}
    if key not in mapping:
        raise ValueError(f"unknown level {raw!r}")
    return mapping[key]

