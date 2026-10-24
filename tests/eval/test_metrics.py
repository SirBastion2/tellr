"""§13.3 / §18.2 metrics: matrix, counts, Wilson, baselines. No held-out data."""

from __future__ import annotations

import pytest
from eval.metrics import (
    summarize,
    wilson_interval,
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


def test_summarize_without_timings_is_not_applicable() -> None:
    """Arms A/B and FakeModel: latency and fallback_rate stay n/a (§13.3)."""
    results = [
        _result("scn.coached.a", "coached", "High"),
        _result("scn.legitimate.a", "legitimate", "Clear"),
    ]
    summary = summarize(results)
    assert summary.latency_p50_ms is None
    assert summary.latency_p95_ms is None
    assert summary.latency_max_ms is None
    assert summary.fallback_rate is None
    assert summary.fallbacks is None
    for baseline in summary.baselines.values():
        assert baseline.latency_p50_ms is None
        assert baseline.fallback_rate is None


def test_summarize_local_llm_timings() -> None:
    """Arm C LocalLLM: p50/p95/max and fallback_rate from recorded timings."""
    from eval.metrics import percentile

    results = [
        _result("scn.coached.a", "coached", "High"),
        _result("scn.legitimate.a", "legitimate", "Clear"),
    ]
    samples = [486, 500, 576, 619]
    summary = summarize(
        results,
        latencies_ms=samples,
        fallbacks=0,
    )
    assert summary.latency_p50_ms == percentile(samples, 50)
    assert summary.latency_p95_ms == percentile(samples, 95)
    assert summary.latency_max_ms == 619
    assert summary.fallbacks == (0, 4)
    assert summary.fallback_rate == 0.0
    assert summary.validator_rejections == 0


def test_summarize_fallback_rate_from_recorded_fallbacks() -> None:
    results = [_result("scn.coached.a", "coached", "High")]
    summary = summarize(results, latencies_ms=[1500, 620, 580], fallbacks=1)
    assert summary.fallbacks == (1, 3)
    assert summary.fallback_rate == pytest.approx(1 / 3)
    assert summary.latency_max_ms == 1500


def test_percentile_matches_linear_interpolation() -> None:
    from eval.metrics import percentile

    assert percentile([], 50) is None
    assert percentile([486], 50) == 486.0
    assert percentile([486], 95) == 486.0
    samples = [486, 500, 619]
    assert percentile(samples, 50) == 500.0
    assert percentile(samples, 95) == pytest.approx(500 + 119 * 0.9)
