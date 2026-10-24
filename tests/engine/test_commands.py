"""check_command raises CommandRejected using the six CHANGE-002 codes."""

from __future__ import annotations

from pathlib import Path

import pytest

from engine import CommandRejected, check_command, load_library, rule_choice

ROOT = Path(__file__).resolve().parents[2]
SHIPPED = ROOT / "library"

OPENED_LIVE = {
    "type": "SessionOpened",
    "mode": "live",
    "amount_band": "5000_9999",
    "library_version": "1.2.0",
}
OPENED_PRACTICE = {**OPENED_LIVE, "mode": "practice"}
OPENER_ANSWERED = {
    "type": "AnswerRecorded",
    "question_id": "q.purpose.open",
    "chip": "specific",
    "purpose": "purpose.home_repair",
}


@pytest.fixture
def lib():
    return load_library(SHIPPED)


def test_rule_choice_is_the_top_ranked_candidate() -> None:
    assert rule_choice(["q.secrecy.told_not_to_tell", "q.alternative.cashiers_check"]) == (
        "q.secrecy.told_not_to_tell"
    )


def test_rule_choice_requires_a_candidate() -> None:
    with pytest.raises(ValueError):
        rule_choice([])


def test_scenario_on_live_session(lib) -> None:
    with pytest.raises(CommandRejected) as err:
        check_command(
            [],
            {"type": "open", "mode": "live", "scenario_id": "T1"},
            lib,
        )
    assert err.value.code == "scenario_on_live_session"


def test_scenario_allowed_on_practice(lib) -> None:
    check_command(
        [],
        {"type": "open", "mode": "practice", "scenario_id": "T1"},
        lib,
    )


def test_purpose_required_on_opener(lib) -> None:
    with pytest.raises(CommandRejected) as err:
        check_command(
            [OPENED_LIVE],
            {"type": "answer", "question_id": "q.purpose.open", "chip": "specific"},
            lib,
        )
    assert err.value.code == "purpose_required_on_opener"


def test_purpose_not_allowed_on_non_opener(lib) -> None:
    with pytest.raises(CommandRejected) as err:
        check_command(
            [OPENED_LIVE, OPENER_ANSWERED],
            {
                "type": "answer",
                "question_id": "q.homerepair.contractor_name",
                "chip": "specific",
                "purpose": "purpose.home_repair",
            },
            lib,
        )
    assert err.value.code == "purpose_not_allowed"


def test_outcome_requires_actor(lib) -> None:
    with pytest.raises(CommandRejected) as err:
        check_command(
            [OPENED_PRACTICE],
            {"type": "outcome", "outcome": "proceed"},
            lib,
        )
    assert err.value.code == "outcome_requires_actor"


def test_close_without_outcome(lib) -> None:
    with pytest.raises(CommandRejected) as err:
        check_command([OPENED_PRACTICE], {"type": "close"}, lib)
    assert err.value.code == "close_without_outcome"


def test_session_closed_rejects_any_append(lib) -> None:
    closed = [OPENED_PRACTICE, {"type": "SessionClosed"}]
    with pytest.raises(CommandRejected) as err:
        check_command(closed, {"type": "context", "chips": ["chip.cash_only"]}, lib)
    assert err.value.code == "session_closed"


def test_six_change_002_codes_are_the_only_rejects(lib) -> None:
    codes = {
        "scenario_on_live_session",
        "purpose_required_on_opener",
        "purpose_not_allowed",
        "outcome_requires_actor",
        "close_without_outcome",
        "session_closed",
    }
    raised: set[str] = set()
    cases = [
        ([], {"type": "open", "mode": "live", "scenario_id": "T1"}),
        ([OPENED_LIVE], {"type": "answer", "question_id": "q.purpose.open", "chip": "specific"}),
        (
            [OPENED_LIVE, OPENER_ANSWERED],
            {
                "type": "answer",
                "question_id": "q.homerepair.contractor_name",
                "chip": "specific",
                "purpose": "purpose.home_repair",
            },
        ),
        ([OPENED_PRACTICE], {"type": "outcome", "outcome": "proceed"}),
        ([OPENED_PRACTICE], {"type": "close"}),
        (
            [OPENED_PRACTICE, {"type": "SessionClosed"}],
            {"type": "context", "chips": ["chip.cash_only"]},
        ),
    ]
    for events, command in cases:
        with pytest.raises(CommandRejected) as err:
            check_command(events, command, lib)
        raised.add(err.value.code)
    assert raised == codes
