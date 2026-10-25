"""Risk scoring (architecture §6). Names match reference_impl.py."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from engine.library import Library, Signal

# Architecture §6.2. Caps and thresholds are part of the formula, not live weights.
CAPS = {
    "third_party": 22,
    "secrecy": 28,
    "story_quality": 30,
    "payment_channel": 25,
    "urgency": 10,
    "mitigating": -45,
}
CAUTION, HIGH, MARGIN, OBSERVATION_CAP, DISPLAY_LEAD = 25, 60, 10, 45, 8
ORDER = ["Clear", "Caution", "High concern"]


@dataclass(frozen=True)
class Tables:
    """Weights, caps, patterns, and look-alikes used by the scoring functions."""

    weights: Mapping[str, tuple[int, str, bool]]
    caps: Mapping[str, int]
    patterns: Mapping[str, Sequence[str]]
    lookalikes: Mapping[str, Mapping[str, Any]]
    caution: int = CAUTION
    high: int = HIGH
    margin: int = MARGIN
    observation_cap: int = OBSERVATION_CAP
    display_lead: int = DISPLAY_LEAD
    refutation: bool = True


def tables_from_library(lib: Library) -> Tables:
    return Tables(
        weights={
            signal.id: (signal.weight, signal.family, signal.requires_interview)
            for signal in lib.signals
        },
        caps=dict(CAPS),
        patterns={pattern.id: list(pattern.signals) for pattern in lib.patterns},
        lookalikes={
            look.id: {
                "pattern": pattern_id,
                "confirmed_by": list(look.confirmed_by),
                "refuted_by": list(look.refuted_by),
            }
            for pattern_id, look in lib.look_alikes
        },
    )


def effective(evidence: Sequence[str], tables: Tables) -> set[str]:
    """§6.2: while a look-alike's refuter is present, its confirmations stop counting."""
    ev = set(evidence)
    if tables.refutation:
        for spec in tables.lookalikes.values():
            if any(item in ev for item in spec["refuted_by"]):
                ev -= set(spec["confirmed_by"])
    return ev


def concerning_interview(ev: Sequence[str], tables: Tables) -> int:
    return sum(
        1
        for sid in ev
        if sid in tables.weights and tables.weights[sid][2] and tables.weights[sid][0] > 0
    )


def score(evidence: Sequence[str], tables: Tables) -> int:
    ev = effective(evidence, tables)
    fam: dict[str, int] = {}
    for sid in ev:
        spec = tables.weights.get(sid)
        if spec is None:
            continue
        fam[spec[1]] = fam.get(spec[1], 0) + spec[0]
    raw = sum(
        max(total, tables.caps[family]) if tables.caps[family] < 0 else min(total, tables.caps[family])
        for family, total in fam.items()
        if family in tables.caps
    )
    raw = max(-45, min(100, raw))
    return raw if concerning_interview(ev, tables) else min(raw, tables.observation_cap)


def level(s: int, tables: Tables | None = None) -> str:
    high = tables.high if tables is not None else HIGH
    caution = tables.caution if tables is not None else CAUTION
    return "High concern" if s >= high else "Caution" if s >= caution else "Clear"


def level_bands(tables: Tables | None = None) -> list[dict[str, Any]]:
    """Inclusive 0–100 bands that match `level()` (architecture §6.3)."""
    high = tables.high if tables is not None else HIGH
    caution = tables.caution if tables is not None else CAUTION
    return [
        {"level": "clear", "label": "Clear", "min": 0, "max": caution - 1},
        {"level": "caution", "label": "Caution", "min": caution, "max": high - 1},
        {"level": "high", "label": "High concern", "min": high, "max": 100},
    ]


def shown(prev: str | None, s: int, tables: Tables | None = None) -> str:
    """§6.3: per-boundary hysteresis, display only."""
    high = tables.high if tables is not None else HIGH
    caution = tables.caution if tables is not None else CAUTION
    margin = tables.margin if tables is not None else MARGIN
    if s >= high or (prev == "High concern" and s > high - margin):
        return "High concern"
    if s >= caution or (prev in ("Caution", "High concern") and s > caution - margin):
        return "Caution"
    return "Clear"


def reasons(evidence: Sequence[str], lvl: str, tables: Tables) -> list[str]:
    """§6.5: up to three, same direction as the level, by raw |weight|, ties by ID."""
    want_mitigating = lvl == "Clear"
    pool = [
        sid
        for sid in effective(evidence, tables)
        if sid in tables.weights and (tables.weights[sid][0] < 0) == want_mitigating
    ]
    return sorted(pool, key=lambda sid: (-abs(tables.weights[sid][0]), sid))[:3]


def counterpoint(evidence: Sequence[str], lvl: str, tables: Tables) -> str | None:
    """At most one opposite-direction item (§6.5)."""
    want_mitigating = lvl != "Clear"
    pool = [
        sid
        for sid in effective(evidence, tables)
        if sid in tables.weights and (tables.weights[sid][0] < 0) == want_mitigating
    ]
    if not pool:
        return None
    return min(pool, key=lambda sid: (-abs(tables.weights[sid][0]), sid))


def contributions(evidence: Sequence[str], lib: Library) -> list[dict[str, Any]]:
    """CHANGE-005 (a): asserted signals that raise or lower the score.

    Weights and labels come from `lib` (the live library the API loaded), not
    `reference_impl.py` or `tests/golden/reference_weights.yaml`. Uses §6.2
    `effective()` so refuted look-alike confirmations are omitted. Sorted by
    absolute weight descending, then `signal_id`.
    """
    tables = tables_from_library(lib)
    signals = {item.id: item for item in lib.signals}
    rows: list[dict[str, Any]] = []
    for signal_id in effective(evidence, tables):
        item = signals.get(signal_id)
        if item is None or item.weight == 0:
            continue
        rows.append(_contribution(item))
    rows.sort(key=lambda row: (-abs(row["weight"]), row["signal_id"]))
    return rows


def _contribution(item: Signal) -> dict[str, Any]:
    return {
        "signal_id": item.id,
        "label": item.name,
        "weight": item.weight,
        "direction": "raises" if item.weight > 0 else "lowers",
    }
