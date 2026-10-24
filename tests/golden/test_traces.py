"""T1–T7 golden traces: RuleEngine matches reference_impl.run_case at every step."""

from __future__ import annotations

import json
from pathlib import Path

import reference_impl as ref
import yaml

from engine import candidates, project, rule_choice, stop
from engine.library import load_library
from engine.rules import RuleEngine

ROOT = Path(__file__).resolve().parents[2]
SHIPPED = ROOT / "library"
REF_WEIGHTS = ROOT / "tests" / "golden" / "reference_weights.yaml"
FIXTURES = ROOT / "contract" / "fixtures"

LEVEL = {"Clear": "clear", "Caution": "caution", "High concern": "high"}
SIGNAL_TO_CHIP = {
    "sig.third_party_call": "chip.on_phone",
    "sig.someone_directing": "chip.someone_directing",
    "sig.cash_insistence": "chip.cash_only",
    "sig.urgency_secrecy_mentioned": "chip.urgency_secrecy",
    "sig.rushed": "chip.rushed",
    "sig.unusual_for_customer": "chip.unusual_for_customer",
}
IGNORE = frozenset({"session_id", "debug", "_engine"})


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


def _public(state: dict) -> dict:
    return {key: value for key, value in state.items() if key not in IGNORE}


def _events_for_fixture(steps: list[dict], upto: int) -> list[dict]:
    events: list[dict] = []
    for step in steps[: upto + 1]:
        endpoint = step["endpoint"]
        request = step["request"]
        if endpoint == "POST /sessions":
            events.append(
                {
                    "type": "SessionOpened",
                    "mode": request["mode"],
                    "amount_band": request["amount_band"],
                    "library_version": "1.2.0",
                }
            )
        elif endpoint.endswith("/context"):
            events.append({"type": "ContextAdded", "chips": list(request["chips"])})
        elif endpoint.endswith("/answers"):
            events.append(
                {
                    "type": "AnswerRecorded",
                    "question_id": request["question_id"],
                    "chip": request["chip"],
                    "purpose": request.get("purpose"),
                }
            )
        else:
            raise AssertionError(f"unexpected fixture endpoint {endpoint}")
    return events


def test_rule_engine_matches_reference_impl_at_every_step() -> None:
    lib = _library_with_reference_weights()
    engine = RuleEngine(lib)
    checked = 0
    for case, (_pop, context, purpose, answers) in ref.CASES.items():
        expected = ref.run_case(context, purpose, answers)
        actual = engine.run_case(context, purpose, answers)
        assert len(actual) == len(expected), case
        for exp, got in zip(expected, actual, strict=True):
            assert got["qid"] == exp["qid"], (case, exp["step"], got["qid"], exp["qid"])
            assert got["chip"] == exp["chip"], (case, exp["step"])
            assert got["stage"] == exp["stage"], (case, exp["step"])
            assert got["score"] == exp["score"], (case, exp["step"])
            assert got["raw"] == exp["raw"], (case, exp["step"])
            assert got["shown"] == exp["shown"], (case, exp["step"])
            assert got["display"] == exp["display"], (case, exp["step"])
            assert got["stop"] == exp["stop"], (case, exp["step"], got["stop"], exp["stop"])
            checked += 1
    assert checked == 35


def test_project_matches_t1_through_t7_fixtures() -> None:
    lib = _library_with_reference_weights()
    checked = 0
    for path in sorted(FIXTURES.glob("T*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        steps = payload["steps"]
        for index, step in enumerate(steps):
            state = project(_events_for_fixture(steps, index), lib)
            expected = _public(step["response"])
            got = _public(state)
            assert got["answers"] == expected["answers"], (payload["case"], index)
            assert got["stated_purpose"] == expected["stated_purpose"], (payload["case"], index)
            assert got["risk"] == expected["risk"], (payload["case"], index)
            assert got["question"] == expected["question"], (payload["case"], index)
            assert got["stop"] == expected["stop"], (payload["case"], index)
            assert got["talk_track"] == expected["talk_track"], (payload["case"], index)
            assert got["suggested_outcome"] == expected["suggested_outcome"], (
                payload["case"],
                index,
            )
            checked += 1
    assert checked == 42


def test_change_000_hard_stop_wins_when_both_hold() -> None:
    """T1's last step: recommended proceed and empty candidates → hard, both reasons."""
    lib = _library_with_reference_weights()
    t1 = json.loads((FIXTURES / "T1.json").read_text(encoding="utf-8"))
    state = project(_events_for_fixture(t1["steps"], len(t1["steps"]) - 1), lib)
    stage, cands = candidates(state, lib)
    assert stage == "probe"
    assert cands == []
    assert state["question"] is None
    assert state["stop"] == {
        "kind": "hard",
        "reason": "enough to proceed; nothing left to ask",
    }
    assert stop(state, lib, cands) == state["stop"]


def test_recommended_stop_keeps_the_top_candidate() -> None:
    """§8.4 / §11.2: question is null only on a hard stop."""
    lib = _library_with_reference_weights()
    t2 = json.loads((FIXTURES / "T2.json").read_text(encoding="utf-8"))
    state = project(_events_for_fixture(t2["steps"], len(t2["steps"]) - 1), lib)
    stage, cands = candidates(state, lib)
    assert state["stop"] == {"kind": "recommended", "reason": "enough to escalate"}
    assert state["question"] is not None
    assert state["question"]["id"] == rule_choice(cands)
    assert state["question"]["stage"] == stage
    assert state["talk_track"]["stage"] == "tt.escalate"
    assert state["talk_track"]["pattern"] == "tt.bank_impersonation"
