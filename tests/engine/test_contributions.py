"""CHANGE-005 (a): contributions from the live library, not reference weights."""

from __future__ import annotations

from pathlib import Path

import yaml

from engine.library import load_library
from engine.score import contributions

ROOT = Path(__file__).resolve().parents[2]
LIVE = ROOT / "library"
REF_WEIGHTS = ROOT / "tests" / "golden" / "reference_weights.yaml"


def _live_signals() -> dict[str, dict]:
    data = yaml.safe_load((LIVE / "signals.yaml").read_text(encoding="utf-8"))
    return {item["id"]: item for item in data["signals"]}


def test_contributions_use_live_library_weights_and_labels() -> None:
    lib = load_library(LIVE)
    live = _live_signals()
    rows = contributions(
        ["sig.third_party_call", "sig.cash_insistence", "mit.purpose_specific"],
        lib,
    )
    assert [row["signal_id"] for row in rows] == [
        "sig.third_party_call",
        "sig.cash_insistence",
        "mit.purpose_specific",
    ]
    for row in rows:
        spec = live[row["signal_id"]]
        assert row["label"] == spec["name"]
        assert row["weight"] == spec["weight"]
        assert row["direction"] == ("raises" if spec["weight"] > 0 else "lowers")


def test_contributions_sort_by_absolute_weight_then_id() -> None:
    lib = load_library(LIVE)
    rows = contributions(
        [
            "sig.rushed",
            "mit.named_counterparty",
            "mit.written_estimate",
            "sig.secrecy_bank",
        ],
        lib,
    )
    assert [row["signal_id"] for row in rows] == [
        "sig.secrecy_bank",
        "mit.named_counterparty",
        "mit.written_estimate",
        "sig.rushed",
    ]
    weights = [abs(row["weight"]) for row in rows]
    assert weights == sorted(weights, reverse=True)


def test_contributions_follow_the_library_object_not_reference_weights() -> None:
    lib = load_library(LIVE)
    pinned = yaml.safe_load(REF_WEIGHTS.read_text(encoding="utf-8"))["weights"]
    target = next(item for item in lib.signals if item.id == "sig.cash_insistence")
    assert target.weight == pinned["sig.cash_insistence"][0]
    target.weight = 99
    rows = contributions(["sig.cash_insistence"], lib)
    assert rows == [
        {
            "signal_id": "sig.cash_insistence",
            "label": "Insists on cash",
            "weight": 99,
            "direction": "raises",
        }
    ]
    assert pinned["sig.cash_insistence"][0] != 99


def test_contributions_omit_refuted_lookalike_confirmations() -> None:
    """§6.2 effective(): a look-alike refuter drops its confirmations from the score."""
    lib = load_library(LIVE)
    rows = contributions(["mit.own_named_account", "sig.secrecy_bank"], lib)
    ids = [row["signal_id"] for row in rows]
    assert "sig.secrecy_bank" in ids
    assert "mit.own_named_account" not in ids


def test_contributions_skip_zero_weight_and_unknown_ids() -> None:
    lib = load_library(LIVE)
    ghost = next(item for item in lib.signals if item.id == "sig.rushed")
    ghost.weight = 0
    rows = contributions(["sig.rushed", "sig.not_in_library"], lib)
    assert rows == []
