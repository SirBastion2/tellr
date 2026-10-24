"""§13.3 / §18.2 metrics: matrix, counts, Wilson, baselines. No held-out data."""

from __future__ import annotations

from eval.metrics import (
    wilson_interval,
    summarize,
)
from eval.types import ArmResult


def _result(
    sid: str,
    population: str,
    level: str,
    *,
    questions: int = 3,
    default_fired: int = 0,
    rejections: int = 0,
) -> ArmResult:
    return ArmResult(
        scenario_id=sid,
        population=population,
        label=sid,
        raw_level=level,
        score=0 if level != "High" else 80,
        questions=questions,
        asked=["q.purpose.open"] * questions,
        default_fired=default_fired,
        validator_rejections=rejections,
        concerning_count=None,
        trace=(),
    )


def test_wilson_13_of_15_is_about_62_to_96() -> None:
    lo, hi = wilson_interval(13, 15)
    assert 0.61 < lo < 0.64
    assert 0.95 < hi < 0.97


def test_summarize_headline_counts_not_percentages() -> None:
    results = [
        _result("scn.coached.a", "coached", "High"),
        _result("scn.coached.b", "coached", "Caution"),
        _result("scn.coached.c", "coached", "Clear"),
        _result("scn.legitimate.a", "legitimate", "Clear"),
        _result("scn.legitimate.b", "legitimate", "Caution"),
        _result("scn.legitimate.c", "legitimate", "High"),
    ]
    summary = summarize(results)
    assert summary.catch == (2, 3)
    assert summary.false_flag == (1, 3)
    assert summary.friction == (2, 3)
    assert summary.misses == ["scn.coached.c"]
    assert summary.matrix["coached"] == {"Clear": 1, "Caution": 1, "High": 1}
    assert summary.matrix["legitimate"] == {"Clear": 1, "Caution": 1, "High": 1}
    assert summary.questions_mean == 3
    assert summary.questions_max == 3
    assert "13/15" not in str(summary.catch)
    assert summary.catch_label == "2/3"
    assert summary.false_flag_label == "1/3"


def test_trivial_baselines_are_published() -> None:
    results = [
        _result("scn.coached.a", "coached", "High"),
        _result("scn.legitimate.a", "legitimate", "Clear"),
    ]
    summary = summarize(results)
    assert set(summary.baselines) == {"always-Clear", "always-Caution", "always-High"}
    assert summary.baselines["always-Clear"].catch == (0, 1)
    assert summary.baselines["always-High"].false_flag == (1, 1)
    assert summary.baselines["always-Caution"].friction == (1, 1)
    assert summary.baselines["always-Caution"].false_flag == (0, 1)
