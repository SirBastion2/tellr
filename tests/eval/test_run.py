"""eval/run.py writes results.json + report.md; labels held-out (A-08; §13.4)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import ClassVar

import pytest
import yaml
from eval.run import main
from tests.eval.helpers import t_scenario


def _write_dev(tmp_path: Path, cases: tuple[str, ...] = ("T1", "T2")) -> Path:
    dev = tmp_path / "dev"
    dev.mkdir()
    for case in cases:
        data = t_scenario(case)
        (dev / f"{data['id']}.yaml").write_text(
            yaml.safe_dump(data, sort_keys=False), encoding="utf-8"
        )
    return dev


HELDOUT_SECTION = "held-out, 5 per population, wide intervals"


def test_run_writes_results_and_report(tmp_path: Path) -> None:
    dev = _write_dev(tmp_path)
    out = tmp_path / "results"
    rc = main(
        [
            "--scenarios",
            str(dev),
            "--out",
            str(out),
            "--arms",
            "A,B,C",
            "--model",
            "fake",
        ]
    )
    assert rc == 0
    payload = json.loads((out / "results.json").read_text(encoding="utf-8"))
    report = (out / "report.md").read_text(encoding="utf-8")
    assert HELDOUT_SECTION not in report
    assert payload["config"] == {
        "temperature": 0,
        "batch_size": 1,
        "prefetch": False,
        "timeout_ms": None,
    }
    assert set(payload["arms"]) == {"A", "B", "C"}
    assert "Confusion matrix" in report
    assert "always-Clear" in report
    assert "Wilson" in report
    assert "default_fired_rate" in report
    assert "Validator rejections" in report
    assert report.count("Latency p50/p95/max: n/a") == 3
    assert report.count("fallback_rate: n/a") == 3
    for name in ("A", "B", "C"):
        metrics = payload["arms"][name]["metrics"]
        assert metrics["latency_p50_ms"] is None
        assert metrics["latency_p95_ms"] is None
        assert metrics["latency_max_ms"] is None
        assert metrics["fallback_rate"] is None
        assert metrics["validator_rejections"] == 0
    assert "T2" in report or "t2" in report.lower() or "scn.coached" in report


def test_run_labels_heldout_section_from_tmp_dir(tmp_path: Path) -> None:
    """A-08: path containing 'heldout' labels the report. Uses a tmp dir, never the real set."""
    held = tmp_path / "heldout"
    held.mkdir()
    data = t_scenario("T2")
    (held / "scn.coached.tmp_t2.yaml").write_text(
        yaml.safe_dump(data, sort_keys=False), encoding="utf-8"
    )
    out = tmp_path / "results"
    rc = main(["--scenarios", str(held), "--out", str(out), "--arms", "B", "--model", "fake"])
    assert rc == 0
    report = (out / "report.md").read_text(encoding="utf-8")
    assert f"## {HELDOUT_SECTION}" in report


def test_run_dev_dir_does_not_use_heldout_label(tmp_path: Path) -> None:
    """Dev (or any non-heldout tmp dir) keeps the ordinary report heading."""
    dev = _write_dev(tmp_path)
    out = tmp_path / "results"
    rc = main(["--scenarios", str(dev), "--out", str(out), "--arms", "A", "--model", "fake"])
    assert rc == 0
    report = (out / "report.md").read_text(encoding="utf-8")
    assert HELDOUT_SECTION not in report


def test_run_does_not_import_api_or_recommenders() -> None:
    import importlib
    import sys

    for name in list(sys.modules):
        if name == "api" or name.startswith("api.") or name == "recommenders":
            del sys.modules[name]
        if name.startswith("recommenders."):
            del sys.modules[name]
        if name == "store" or name.startswith("store."):
            del sys.modules[name]
    importlib.invalidate_caches()
    sys.modules.pop("eval.run", None)
    importlib.import_module("eval.run")
    assert "api" not in sys.modules
    assert "store" not in sys.modules
    assert "recommenders" not in sys.modules


def test_a3_tests_do_not_read_real_heldout() -> None:
    """H owns eval/scenarios/heldout/. These tests use t_scenario / tmp dirs only."""
    from tests.eval import helpers

    source = Path(helpers.__file__).read_text(encoding="utf-8")
    assert "eval/scenarios/heldout" not in source
    assert "scenarios/heldout" not in source


class _StubLocal:
    """Stand-in for A-05 LocalLLM. Hours 12–15 tests; no GPU."""

    def __init__(self, **kwargs: object) -> None:
        self.kwargs = kwargs
        self.warmed = 0
        self.seen: list[tuple[object, list[object]]] = []

    def warmup(self) -> bool:
        self.warmed += 1
        return True

    def next(self, state: object, candidates: list[object]) -> object:
        from recommenders.base import Recommendation

        self.seen.append((state, list(candidates)))
        ids = [item.id if hasattr(item, "id") else str(item) for item in candidates]
        return Recommendation(next_question_id=ids[0], signals_asserted=[])


def test_run_accepts_model_local(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Hours 12–15: --model local is the GPU arm-C path (A-05 LocalLLM)."""
    stub = _StubLocal()

    def _from_env(library: object) -> object:
        from eval.arms.model import LocalModel

        return LocalModel(library=library, client=stub)

    monkeypatch.setattr("eval.arms.model.LocalModel.from_env", _from_env)
    monkeypatch.setattr("eval.run.LocalModel.from_env", _from_env)
    dev = _write_dev(tmp_path)
    out = tmp_path / "results"
    rc = main(
        [
            "--scenarios",
            str(dev),
            "--out",
            str(out),
            "--arms",
            "C",
            "--model",
            "local",
        ]
    )
    assert rc == 0
    assert stub.warmed == 1
    assert (out / "report.md").is_file()
    assert (out / "results.json").is_file()


class _RecordedLocal(_StubLocal):
    """LocalLLM stand-in with the timings/fallbacks B-013 asked the report to show."""

    latencies_ms: ClassVar[list[int]] = [486, 500, 576, 619]
    fallbacks = 0


def test_report_arm_c_uses_local_llm_timings(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Arm C reads LocalLLM recorded timings; A/B stay n/a. Fake stays n/a."""
    from eval.metrics import percentile

    stub = _RecordedLocal()

    def _from_env(library: object) -> object:
        from eval.arms.model import LocalModel

        return LocalModel(library=library, client=stub)

    monkeypatch.setattr("eval.arms.model.LocalModel.from_env", _from_env)
    monkeypatch.setattr("eval.run.LocalModel.from_env", _from_env)
    dev = _write_dev(tmp_path)
    out = tmp_path / "results"
    rc = main(
        [
            "--scenarios",
            str(dev),
            "--out",
            str(out),
            "--arms",
            "A,B,C",
            "--model",
            "local",
        ]
    )
    assert rc == 0
    payload = json.loads((out / "results.json").read_text(encoding="utf-8"))
    report = (out / "report.md").read_text(encoding="utf-8")
    samples = _RecordedLocal.latencies_ms
    p50 = percentile(samples, 50)
    p95 = percentile(samples, 95)
    assert report.count("Latency p50/p95/max: n/a") == 2
    assert report.count("fallback_rate: n/a") == 2
    assert f"Latency p50/p95/max: {p50:.0f} / {p95:.0f} / 619 ms" in report
    assert "fallback_rate: 0/4" in report
    for name in ("A", "B"):
        metrics = payload["arms"][name]["metrics"]
        assert metrics["latency_p50_ms"] is None
        assert metrics["fallback_rate"] is None
        assert metrics["validator_rejections"] == 0
    c_metrics = payload["arms"]["C"]["metrics"]
    assert c_metrics["latency_p50_ms"] == p50
    assert c_metrics["latency_p95_ms"] == p95
    assert c_metrics["latency_max_ms"] == 619
    assert c_metrics["fallback_rate"] == 0.0
    assert c_metrics["fallbacks"] == [0, 4]
    assert c_metrics["validator_rejections"] == 0


def test_local_model_records_timings_and_fallbacks_when_client_does_not() -> None:
    """Real LocalLLM has no stats bag; LocalModel records wall-clock and fallbacks."""
    from eval.arms.model import LocalModel

    class Silent:
        def next(self, state: object, candidates: list[object]) -> object:
            from recommenders.base import Recommendation

            ids = [item.id if hasattr(item, "id") else str(item) for item in candidates]
            return Recommendation(next_question_id=ids[0], signals_asserted=[])

    class Boom:
        def next(self, state: object, candidates: list[object]) -> object:
            raise OSError("llama-server down")

    ok = LocalModel(library=object(), client=Silent())  # type: ignore[arg-type]
    qid = ok.choose(
        candidates=["q.purpose.open"],
        temperature=0,
        batch_size=1,
        prefetch=False,
        timeout_ms=None,
        state={},
    )
    assert qid == "q.purpose.open"
    assert len(ok.recorded_latencies()) == 1
    assert ok.recorded_fallbacks() == 0

    bad = LocalModel(library=object(), client=Boom())  # type: ignore[arg-type]
    empty = bad.choose(
        candidates=["q.purpose.open"],
        temperature=0,
        batch_size=1,
        prefetch=False,
        timeout_ms=None,
        state={},
    )
    assert empty == ""
    assert len(bad.recorded_latencies()) == 1
    assert bad.recorded_fallbacks() == 1


def test_run_unknown_model_is_rejected(tmp_path: Path) -> None:
    dev = _write_dev(tmp_path)
    out = tmp_path / "results"
    rc = main(
        [
            "--scenarios",
            str(dev),
            "--out",
            str(out),
            "--arms",
            "C",
            "--model",
            "hosted",
        ]
    )
    assert rc == 2
