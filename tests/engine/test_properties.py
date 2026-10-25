"""Architecture §6.2 / §6.3 properties, ported from reference_impl.check_properties()."""

from __future__ import annotations

import time
from collections.abc import Callable
from itertools import combinations
from pathlib import Path

import pytest
import reference_impl as ref
import yaml

from engine.hypotheses import displayed, pattern_scores
from engine.library import load_library
from engine.score import (
    Tables,
    effective,
    level,
    level_bands,
    reasons,
    score,
    shown,
    tables_from_library,
)

ROOT = Path(__file__).resolve().parents[2]
REF_WEIGHTS = ROOT / "tests" / "golden" / "reference_weights.yaml"
LIVE_LIBRARY = ROOT / "library"
ORDER = ["Clear", "Caution", "High concern"]


def reference_tables() -> Tables:
    data = yaml.safe_load(REF_WEIGHTS.read_text(encoding="utf-8"))
    thresholds = data["thresholds"]
    return Tables(
        weights={key: tuple(value) for key, value in data["weights"].items()},
        caps=dict(data["caps"]),
        patterns={key: list(value) for key, value in ref.PATTERNS.items()},
        lookalikes={key: dict(value) for key, value in ref.LOOKALIKES.items()},
        caution=thresholds["caution"],
        high=thresholds["high"],
        margin=thresholds["margin"],
        observation_cap=thresholds["observation_cap"],
        display_lead=thresholds["display_lead"],
    )


def live_tables() -> Tables:
    """A-07: the same §6.2 walk over library/signals.yaml, not the golden pin."""
    return tables_from_library(load_library(LIVE_LIBRARY))


def _check_properties(tables: Tables) -> tuple[int, dict[str, int]]:
    """Same exhaustive walk as reference_impl.check_properties()."""
    ids = sorted(tables.weights)
    neg = [sid for sid in ids if tables.weights[sid][0] < 0]
    pos = [sid for sid in ids if tables.weights[sid][0] > 0]
    context = [sid for sid, spec in tables.weights.items() if not spec[2]]
    bad = {
        "mitigating never raises the score": 0,
        "concerning never lowers the score": 0,
        "score >= 60 implies a concerning interview signal": 0,
        "context-only evidence never reaches High": 0,
        "reasons never point against the level": 0,
    }
    subsets = 0
    for k in range(len(ids) + 1):
        for ev in combinations(ids, k):
            subsets += 1
            ev = list(ev)
            s = score(ev, tables)
            bad["mitigating never raises the score"] += sum(
                1 for m in neg if m not in ev and score(ev + [m], tables) > s
            )
            bad["concerning never lowers the score"] += sum(
                1 for p in pos if p not in ev and score(ev + [p], tables) < s
            )
            ev_eff = effective(ev, tables)
            interview = sum(
                1 for sid in ev_eff if tables.weights[sid][2] and tables.weights[sid][0] > 0
            )
            if s >= tables.high and not interview:
                bad["score >= 60 implies a concerning interview signal"] += 1
            if ev and all(item in context for item in ev) and level(s, tables) == "High concern":
                bad["context-only evidence never reaches High"] += 1
            for lvl in ORDER:
                got = reasons(ev, lvl, tables)
                if any((tables.weights[item][0] < 0) != (lvl == "Clear") for item in got):
                    bad["reasons never point against the level"] += 1
    for s in range(-45, 101):
        for prev in ORDER:
            if ORDER.index(shown(prev, s, tables)) < ORDER.index(level(s, tables)):
                bad.setdefault("hysteresis never shows below raw", 0)
                bad["hysteresis never shows below raw"] += 1
        if ORDER.index(shown("High concern", s, tables)) < ORDER.index(
            shown("Caution", s, tables)
        ):
            bad.setdefault("hysteresis is path-independent", 0)
            bad["hysteresis is path-independent"] += 1
    bad.setdefault("hysteresis never shows below raw", 0)
    bad.setdefault("hysteresis is path-independent", 0)
    return subsets, bad


def _assert_weights_respect_caps_and_signs(tables: Tables) -> None:
    """A-07: a sign flip or a cap below a weight is a property failure."""
    for sid, (weight, family, _interview) in tables.weights.items():
        cap = tables.caps[family]
        if cap >= 0:
            assert weight <= cap, f"{sid} weight {weight} exceeds family cap {cap}"
        else:
            assert weight >= cap, f"{sid} weight {weight} is below family floor {cap}"
        if sid.startswith("mit."):
            assert weight < 0, f"{sid} sign-flipped to {weight}"
            assert family == "mitigating", f"{sid} left the mitigating family"
        else:
            assert weight > 0, f"{sid} sign-flipped to {weight}"
            assert family != "mitigating", f"{sid} joined the mitigating family"


@pytest.mark.parametrize(
    "tables_fn",
    [reference_tables, live_tables],
    ids=["reference_weights", "live_signals"],
)
def test_properties_over_all_65536_evidence_sets(tables_fn: Callable[[], Tables]) -> None:
    tables = tables_fn()
    _assert_weights_respect_caps_and_signs(tables)
    started = time.perf_counter()
    subsets, bad = _check_properties(tables)
    elapsed = time.perf_counter() - started
    print(f"\nproperty test ({tables_fn.__name__}) over {subsets:,} sets in {elapsed:.2f}s")
    assert subsets == 2 ** len(tables.weights)
    assert all(count == 0 for count in bad.values()), bad
    # Card A-02: report duration in HANDOFF if this exceeds 60s; do not drop subsets.
    if elapsed >= 60:
        print(f"WARNING: property test took {elapsed:.2f}s (>= 60)")


def test_properties_match_the_oracle() -> None:
    tables = reference_tables()
    subsets, bad = _check_properties(tables)
    ref_subsets, ref_bad = ref.check_properties()
    assert subsets == ref_subsets == 65_536
    assert bad == ref_bad


def test_scoring_functions_match_oracle_on_reference_cases() -> None:
    tables = reference_tables()
    for name, (_pop, context, purpose, answers) in ref.CASES.items():
        for row in ref.run_case(context, purpose, answers):
            evidence = row["state"]["evidence"]
            assert score(evidence, tables) == row["score"], name
            assert level(row["score"], tables) == row["raw"], name
            assert reasons(evidence, row["shown"], tables) == ref.reasons(
                evidence, row["shown"]
            ), name
            assert pattern_scores(evidence, tables) == ref.pattern_scores(evidence), name
            assert displayed(evidence, row["shown"], tables) == row["display"], name


def test_level_bands_match_level_on_urgency_score_range() -> None:
    tables = reference_tables()
    bands = level_bands(tables)
    assert [row["label"] for row in bands] == ORDER
    assert bands[0]["min"] == 0
    assert bands[-1]["max"] == 100
    for value in range(101):
        matched = [row for row in bands if row["min"] <= value <= row["max"]]
        assert len(matched) == 1
        assert matched[0]["label"] == level(value, tables)
