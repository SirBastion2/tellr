"""Hypothesis ranking (architecture §7.1). Names match reference_impl.py."""

from __future__ import annotations

from collections.abc import Sequence

from engine.score import Tables, effective


def pattern_scores(evidence: Sequence[str], tables: Tables) -> dict[str, int]:
    ev = effective(evidence, tables)
    return {
        pattern: sum(
            tables.weights[sid][0]
            for sid in signals
            if sid in ev and sid in tables.weights
        )
        for pattern, signals in tables.patterns.items()
    }


def top_pattern(evidence: Sequence[str], tables: Tables) -> str | None:
    ps = pattern_scores(evidence, tables)
    in_play = [pattern for pattern in tables.patterns if ps[pattern] > 0]
    return max(in_play, key=lambda pattern: ps[pattern]) if in_play else None


def displayed(evidence: Sequence[str], lvl: str, tables: Tables) -> str:
    ev = effective(evidence, tables)
    if lvl == "Clear":
        if not tables.lookalikes:
            return "Pattern unclear"
        counts = {
            look: sum(1 for item in spec["confirmed_by"] if item in ev)
            for look, spec in tables.lookalikes.items()
        }
        best = max(counts, key=lambda look: counts[look])
        return f"Matches: {best}" if counts[best] >= 2 else "Pattern unclear"
    ps = pattern_scores(evidence, tables)
    if len(tables.patterns) < 2:
        return "Pattern unclear"
    top, runner_up = sorted(tables.patterns, key=lambda pattern: -ps[pattern])[:2]
    own_interview_signal = any(
        sid in ev and sid in tables.weights and tables.weights[sid][2]
        for sid in tables.patterns[top]
    )
    if own_interview_signal and ps[top] - ps[runner_up] >= tables.display_lead:
        return f"Looks like: {top}"
    return "Pattern unclear"
