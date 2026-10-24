"""eval/run.py writes results.json + report.md; refuses held-out (A-06; §13.4)."""

from __future__ import annotations

import json
from pathlib import Path

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
    assert "T2" in report or "t2" in report.lower() or "scn.coached" in report


def test_run_refuses_heldout_directory(tmp_path: Path) -> None:
    held = tmp_path / "heldout"
    held.mkdir()
    data = t_scenario("T2")
    (held / "scn.coached.secret.yaml").write_text(
        yaml.safe_dump(data, sort_keys=False), encoding="utf-8"
    )
    out = tmp_path / "results"
    with pytest.raises(SystemExit) as exc:
        main(["--scenarios", str(held), "--out", str(out), "--arms", "B", "--model", "fake"])
    assert exc.value.code != 0


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


def test_no_heldout_directory_created(repo_root: Path) -> None:
    heldout = repo_root / "eval" / "scenarios" / "heldout"
    if not heldout.exists():
        return
    yamls = list(heldout.glob("*.yaml")) + list(heldout.glob("*.yml"))
    assert yamls == [], "A3 must not write eval/scenarios/heldout/"
