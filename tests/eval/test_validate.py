"""Acceptance tests for eval/validate.py (A-06 hours 2–6). Tests first."""

from __future__ import annotations

import importlib
import re
import sys
from pathlib import Path

import pytest
import yaml

SCORE_LEAK = re.compile(
    r"\b(score|catch rate|false-flag|wilson|confusion matrix|raw_level)\b",
    re.IGNORECASE,
)


def _write_scenario(path: Path, data: dict) -> Path:
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    return path


def _valid(tmp_path: Path) -> dict:
    return {
        "id": "scn.coached.tmp_bank",
        "label": "Coached — temporary valid fixture",
        "population": "coached",
        "pattern_truth": "pat.bank_impersonation",
        "stated_purpose": "purpose.moving_money",
        "context_chips": ["chip.on_phone"],
        "answers": {"purpose": "relayed_by_caller", "secrecy": "confirmed"},
        "default": "vague",
        "tags": ["cover_story"],
        "source": "test",
    }


def test_validate_module_imports_without_engine() -> None:
    for name in list(sys.modules):
        if name == "engine" or name.startswith("engine.") or name == "reference_impl":
            del sys.modules[name]
    importlib.invalidate_caches()
    sys.modules.pop("eval.validate", None)
    sys.modules.pop("eval", None)
    importlib.import_module("eval.validate")
    assert "engine" not in sys.modules
    assert "reference_impl" not in sys.modules


def test_unknown_intent_is_rejected(tmp_path: Path, library_path: Path) -> None:
    from eval.validate import validate_path

    data = _valid(tmp_path)
    data["answers"] = {"not_an_intent": "vague"}
    path = _write_scenario(tmp_path / "bad_intent.yaml", data)
    errors = validate_path(path, library_path)
    assert errors
    assert any("intent" in e.lower() for e in errors)


def test_unknown_chip_is_rejected(tmp_path: Path, library_path: Path) -> None:
    from eval.validate import validate_path

    data = _valid(tmp_path)
    data["answers"] = {"purpose": "not_a_chip"}
    path = _write_scenario(tmp_path / "bad_chip.yaml", data)
    errors = validate_path(path, library_path)
    assert errors
    assert any("chip" in e.lower() for e in errors)


def test_unknown_purpose_is_rejected(tmp_path: Path, library_path: Path) -> None:
    from eval.validate import validate_path

    data = _valid(tmp_path)
    data["stated_purpose"] = "purpose.not_in_library"
    path = _write_scenario(tmp_path / "bad_purpose.yaml", data)
    errors = validate_path(path, library_path)
    assert errors
    assert any("purpose" in e.lower() for e in errors)


def test_unknown_context_chip_is_rejected(tmp_path: Path, library_path: Path) -> None:
    from eval.validate import validate_path

    data = _valid(tmp_path)
    data["context_chips"] = ["chip.not_in_library"]
    path = _write_scenario(tmp_path / "bad_context.yaml", data)
    errors = validate_path(path, library_path)
    assert errors
    assert any("context" in e.lower() for e in errors)


def test_chip_not_on_intent_is_rejected(tmp_path: Path, library_path: Path) -> None:
    from eval.validate import validate_path

    data = _valid(tmp_path)
    data["answers"] = {"secrecy": "specific"}
    path = _write_scenario(tmp_path / "wrong_kind.yaml", data)
    errors = validate_path(path, library_path)
    assert errors
    assert any("secrecy" in e.lower() and "specific" in e.lower() for e in errors)


def test_valid_scenario_has_no_errors(tmp_path: Path, library_path: Path) -> None:
    from eval.validate import validate_path

    path = _write_scenario(tmp_path / "ok.yaml", _valid(tmp_path))
    assert validate_path(path, library_path) == []


def test_coached_requires_pattern_truth(tmp_path: Path, library_path: Path) -> None:
    from eval.validate import validate_path

    data = _valid(tmp_path)
    data["pattern_truth"] = None
    path = _write_scenario(tmp_path / "no_truth.yaml", data)
    errors = validate_path(path, library_path)
    assert errors
    assert any("pattern_truth" in e for e in errors)


def test_legitimate_requires_null_pattern_truth(
    tmp_path: Path, library_path: Path
) -> None:
    from eval.validate import validate_path

    data = _valid(tmp_path)
    data["id"] = "scn.legitimate.tmp_ok"
    data["population"] = "legitimate"
    data["pattern_truth"] = "pat.bank_impersonation"
    data["tags"] = []
    path = _write_scenario(tmp_path / "legit_truth.yaml", data)
    errors = validate_path(path, library_path)
    assert errors
    assert any("pattern_truth" in e for e in errors)


def test_forbidden_identity_fields_rejected(tmp_path: Path, library_path: Path) -> None:
    from eval.validate import validate_path

    data = _valid(tmp_path)
    data["age"] = 72
    path = _write_scenario(tmp_path / "age.yaml", data)
    errors = validate_path(path, library_path)
    assert errors
    assert any("age" in e.lower() for e in errors)


def test_cli_prints_no_scores(
    tmp_path: Path, library_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    from eval.validate import main

    _write_scenario(tmp_path / "ok.yaml", _valid(tmp_path))
    rc = main([str(tmp_path), "--library", str(library_path)])
    captured = capsys.readouterr()
    assert rc == 0
    assert SCORE_LEAK.search(captured.out) is None
    assert SCORE_LEAK.search(captured.err) is None
    assert "valid" in captured.out.lower()


def test_cli_failure_prints_no_scores(
    tmp_path: Path, library_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    from eval.validate import main

    data = _valid(tmp_path)
    data["answers"] = {"mystery": "vague"}
    _write_scenario(tmp_path / "bad.yaml", data)
    rc = main([str(tmp_path), "--library", str(library_path)])
    captured = capsys.readouterr()
    assert rc == 1
    assert SCORE_LEAK.search(captured.out) is None
    assert SCORE_LEAK.search(captured.err) is None
