"""T1–T7 golden traces: fold matches reference_impl.run_case at every step."""

from __future__ import annotations

from pathlib import Path

import yaml

import reference_impl as ref
from engine import project
from engine.library import load_library
from engine.score import reasons

ROOT = Path(__file__).resolve().parents[2]
SHIPPED = ROOT / "library"
REF_WEIGHTS = ROOT / "tests" / "golden" / "reference_weights.yaml"

LEVEL = {"Clear": "clear", "Caution": "caution", "High concern": "high"}
SIGNAL_TO_CHIP = {
    "sig.third_party_call": "chip.on_phone",
    "sig.someone_directing": "chip.someone_directing",
    "sig.cash_insistence": "chip.cash_only",
    "sig.urgency_secrecy_mentioned": "chip.urgency_secrecy",
    "sig.rushed": "chip.rushed",
    "sig.unusual_for_customer": "chip.unusual_for_customer",
}


def _library_with_reference_weights():
    """Pin golden scoring to reference_weights.yaml, never library/signals.yaml."""
    lib = load_library(SHIPPED)
    data = yaml.safe_load(REF_WEIGHTS.read_text(encoding="utf-8"))
    weights = data["weights"]
    for signal in lib.signals:
        if signal.id in weights:
            weight, family, interview = weights[signal.id]
            signal.weight = weight
            signal.family = family
            signal.requires_interview = interview
    return lib


def _events_for(context: list[str], purpose: str, rows: list[dict], upto: int) -> list[dict]:
    events: list[dict] = [
        {
            "type": "SessionOpened",
            "mode": "practice",
            "amount_band": "5000_9999",
            "library_version": "1.2.0",
        }
    ]
    for row in rows[: upto + 1]:
        if row["qid"] is None:
            events.append(
                {
                    "type": "ContextAdded",
                    "chips": [SIGNAL_TO_CHIP[sid] for sid in context],
                }
            )
            continue
        event = {
            "type": "AnswerRecorded",
            "question_id": row["qid"],
            "chip": row["chip"],
            "purpose": None,
        }
        if row["qid"] == "q.purpose.open":
            event["purpose"] = f"purpose.{purpose}"
        events.append(event)
    return events


def _assert_step(state: dict, row: dict, case: str) -> None:
    evidence = row["state"]["evidence"]
    assert state["risk"]["score"] == row["score"], (case, row["step"])
    assert state["risk"]["raw_level"] == LEVEL[row["raw"]], (case, row["step"])
    assert state["risk"]["level"] == LEVEL[row["shown"]], (case, row["step"])
    assert [item["id"] for item in state["risk"]["reasons"]] == ref.reasons(
        evidence, row["shown"]
    ), (case, row["step"])
    display = row["display"]
    if display == "Pattern unclear":
        assert state["risk"]["pattern"] is None, (case, row["step"])
        assert state["risk"]["pattern_label"] == "Pattern unclear", (case, row["step"])
    else:
        _head, ident = display.split(": ", 1)
        assert state["risk"]["pattern"] is not None, (case, row["step"])
        assert state["risk"]["pattern"]["id"] == ident, (case, row["step"])


def test_t1_through_t7_match_reference_impl_at_every_step() -> None:
    lib = _library_with_reference_weights()
    checked = 0
    for case, (_pop, context, purpose, answers) in ref.CASES.items():
        rows = ref.run_case(context, purpose, answers)
        for index, row in enumerate(rows):
            state = project(_events_for(context, purpose, rows, index), lib)
            _assert_step(state, row, case)
            checked += 1
    assert checked == 35  # 7 cases × (1 context + questions); T1–T7 rows from run_case


def test_stated_purpose_does_not_change_score_or_pattern() -> None:
    lib = _library_with_reference_weights()
    context = ["sig.cash_insistence", "sig.third_party_call"]
    rows = ref.run_case(
        context,
        "home_repair",
        dict(purpose="specific", counterparty_identity="vague"),
    )
    # Only the context + opener (specific). Purpose is a fact; it must not score.
    opener = [row for row in rows if row["qid"] == "q.purpose.open"][0]
    home = project(_events_for(context, "home_repair", rows[:2], 1), lib)
    vehicle = project(_events_for(context, "vehicle", rows[:2], 1), lib)
    assert home["risk"]["score"] == vehicle["risk"]["score"] == opener["score"]
    assert home["risk"]["pattern_label"] == vehicle["risk"]["pattern_label"]
    assert home["stated_purpose"] == "purpose.home_repair"
    assert vehicle["stated_purpose"] == "purpose.vehicle"


def test_reasons_function_matches_oracle_pool() -> None:
    """reasons() IDs match the oracle; goldens load reference weights, not live YAML."""
    data = yaml.safe_load(REF_WEIGHTS.read_text(encoding="utf-8"))
    assert "sig.secrecy_bank" in data["weights"]
    evidence = ["sig.third_party_call", "sig.cash_insistence", "mit.purpose_specific"]
    assert reasons(evidence, "Caution", _tables()) == ref.reasons(evidence, "Caution")
    assert reasons(evidence, "Clear", _tables()) == ref.reasons(evidence, "Clear")


def _tables():
    from engine.score import Tables

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
