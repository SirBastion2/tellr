"""A-01 library boot validation (architecture §5.1, §5.4, §5.5)."""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest
import yaml

from engine import load_library
from engine.library import LibraryBootError

ROOT = Path(__file__).resolve().parents[2]
SHIPPED = ROOT / "library"


def _write_yaml(dir_path: Path, name: str, data: object) -> None:
    (dir_path / name).write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")


def _minimal_library() -> dict[str, object]:
    return {
        "library_version": "0.0.0",
        "copy_status": "test",
        "patterns": [
            {
                "id": "pat.home_repair",
                "name": "Home repair",
                "signals": ["sig.cash_insistence"],
                "look_alikes": [
                    {
                        "id": "look.contractor_with_estimate",
                        "description": "Paying a contractor",
                        "confirmed_by": ["mit.named_counterparty"],
                        "refuted_by": [],
                        "verifying_questions": ["q.homerepair.contractor_name"],
                    }
                ],
            }
        ],
        "purposes": [
            {
                "id": "purpose.home_repair",
                "label": "Home repair",
                "routes_to": "pat.home_repair",
                "verifies": "look.contractor_with_estimate",
            }
        ],
        "questions": [
            {
                "id": "q.purpose.open",
                "intent": "purpose",
                "text": "What's the money for today?",
                "why": "opener",
                "kind": "open",
                "role": "opener",
                "chips": ["specific"],
                "asserts_on": {"specific": ["mit.purpose_specific"]},
            },
            {
                "id": "q.homerepair.contractor_name",
                "intent": "counterparty_identity",
                "text": "Who's doing the work?",
                "why": "named contractor",
                "kind": "open",
                "role": "verify",
                "pattern": "pat.home_repair",
                "tests": ["pat.home_repair", "look.contractor_with_estimate"],
                "chips": ["specific"],
            },
            {
                "id": "q.alternative.cashiers_check",
                "intent": "payment_flexibility",
                "text": "Would a cashier's check work?",
                "why": "safer option",
                "kind": "yes_no",
                "role": "probe",
                "chips": ["confirmed", "denied"],
                "asserts_on": {"confirmed": ["mit.accepts_alternative"]},
            },
        ],
        "signals": [
            {
                "id": "sig.cash_insistence",
                "name": "Insists on cash",
                "family": "payment_channel",
                "weight": 12,
                "requires_interview": False,
                "rationale": "Scams favour cash.",
            },
            {
                "id": "mit.named_counterparty",
                "name": "Named the payee",
                "family": "mitigating",
                "weight": -15,
                "requires_interview": True,
                "rationale": "A real job has a named person.",
            },
            {
                "id": "mit.purpose_specific",
                "name": "Clear purpose",
                "family": "mitigating",
                "weight": -10,
                "requires_interview": True,
                "rationale": "The customer described the purpose.",
            },
            {
                "id": "mit.accepts_alternative",
                "name": "Accepted a cashier's check",
                "family": "mitigating",
                "weight": -20,
                "requires_interview": True,
                "rationale": "Traceable payment.",
            },
        ],
        "chips": [
            {"id": "specific", "label": "Gave specific details", "used_on": "open"},
            {"id": "confirmed", "label": "Yes", "used_on": "yes_no"},
            {"id": "denied", "label": "No", "used_on": "yes_no"},
        ],
        "context_chips": [
            {
                "id": "chip.cash_only",
                "label": "Insists on cash",
                "signal": "sig.cash_insistence",
                "probe": "q.alternative.cashiers_check",
            }
        ],
        "talk_tracks": [],
    }


def _dump_library(dir_path: Path, data: dict[str, object]) -> None:
    for key, value in data.items():
        _write_yaml(dir_path, f"{key}.yaml", {key: value})


def test_shipped_library_boots() -> None:
    lib = load_library(SHIPPED)
    question_ids = {q.id for q in lib.questions}
    assert question_ids == {
        "q.purpose.open",
        "q.homerepair.contractor_name",
        "q.homerepair.estimate",
        "q.recipient.account_details",
        "q.secrecy.told_not_to_tell",
        "q.alternative.cashiers_check",
    }
    assert {p.id for p in lib.patterns} >= {
        "pat.home_repair",
        "pat.bank_impersonation",
        "pat.government_impersonation",
        "pat.family_emergency",
        "pat.tech_support",
    }
    review = {p.id: p.review for p in lib.patterns}
    assert review["pat.government_impersonation"] == "compliance"
    assert review["pat.family_emergency"] == "compliance"
    assert review["pat.tech_support"] == "compliance"
    assert review["pat.home_repair"] is None
    assert review["pat.bank_impersonation"] is None


def test_shipped_signal_weights_match_reference() -> None:
    import reference_impl as ref

    lib = load_library(SHIPPED)
    got = {s.id: (s.weight, s.family, s.requires_interview) for s in lib.signals}
    want = {sid: (w, fam, iv) for sid, (w, fam, iv) in ref.W.items()}
    assert got == want


def test_unresolved_id_fails_boot(tmp_path: Path) -> None:
    data = _minimal_library()
    patterns = data["patterns"]
    assert isinstance(patterns, list)
    patterns[0]["signals"] = ["sig.does_not_exist"]
    _dump_library(tmp_path, data)
    with pytest.raises(LibraryBootError, match="unresolved"):
        load_library(tmp_path)


def test_yes_no_question_without_asserts_on_fails_boot(tmp_path: Path) -> None:
    data = _minimal_library()
    questions = data["questions"]
    assert isinstance(questions, list)
    del questions[2]["asserts_on"]
    _dump_library(tmp_path, data)
    with pytest.raises(LibraryBootError, match="asserts_on"):
        load_library(tmp_path)


def test_signal_without_rationale_fails_boot(tmp_path: Path) -> None:
    data = _minimal_library()
    signals = data["signals"]
    assert isinstance(signals, list)
    del signals[0]["rationale"]
    _dump_library(tmp_path, data)
    with pytest.raises(LibraryBootError, match="rationale"):
        load_library(tmp_path)


def test_empty_signal_rationale_fails_boot(tmp_path: Path) -> None:
    data = _minimal_library()
    signals = data["signals"]
    assert isinstance(signals, list)
    signals[0]["rationale"] = "   "
    _dump_library(tmp_path, data)
    with pytest.raises(LibraryBootError, match="rationale"):
        load_library(tmp_path)


def test_minimal_valid_library_boots(tmp_path: Path) -> None:
    _dump_library(tmp_path, _minimal_library())
    lib = load_library(tmp_path)
    assert lib.library_version == "0.0.0"
    assert len(lib.questions) == 3


def test_shipped_library_is_split_yaml() -> None:
    names = sorted(p.name for p in SHIPPED.glob("*.yaml"))
    assert names
    for required in (
        "patterns.yaml",
        "purposes.yaml",
        "questions.yaml",
        "signals.yaml",
        "chips.yaml",
        "talk_tracks.yaml",
    ):
        assert required in names


def test_mutating_shipped_copy_unresolved_still_fails(tmp_path: Path) -> None:
    shutil.copytree(SHIPPED, tmp_path / "lib")
    questions_path = tmp_path / "lib" / "questions.yaml"
    payload = yaml.safe_load(questions_path.read_text(encoding="utf-8"))
    questions = payload["questions"] if isinstance(payload, dict) else payload
    questions[0]["tests"] = ["pat.not_in_library"]
    questions_path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")
    with pytest.raises(LibraryBootError, match="unresolved"):
        load_library(tmp_path / "lib")
