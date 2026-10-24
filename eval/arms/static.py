"""Arm A — static yes/no sheet (architecture §13.2).

Chip → concerning mapping and threshold are the hours 2–8 prior from
eval/PREREGISTRATION.md (draft / freeze). This module does not change them.
"""

from __future__ import annotations

from collections.abc import Mapping

from engine.library import Library
from eval.types import ArmResult, Scenario

# Interview items, library order from the pre-registration sheet.
INTERVIEW_INTENTS = (
    "purpose",
    "counterparty_identity",
    "written_estimate",
    "receiving_account",
    "secrecy",
    "payment_flexibility",
)

# Observational items. chip.above_threshold is the trigger, not a yes (§18.6).
CONTEXT_ITEMS = (
    "chip.on_phone",
    "chip.someone_directing",
    "chip.cash_only",
    "chip.urgency_secrecy",
    "chip.rushed",
    "chip.unusual_for_customer",
)

OPEN_CONCERNING = {
    "specific": False,
    "vague": True,
    "no_answer": True,
    "changed": True,
    "relayed_by_caller": True,
}

SECRECY_CONCERNING = {
    "confirmed": True,
    "denied": False,
    "no_answer": True,
    "changed": True,
    "relayed_by_caller": True,
}

FLEXIBILITY_CONCERNING = {
    "confirmed": False,
    "denied": True,
    "no_answer": True,
    "changed": True,
    "relayed_by_caller": True,
}

INTENT_MAP = {
    "purpose": OPEN_CONCERNING,
    "counterparty_identity": OPEN_CONCERNING,
    "written_estimate": OPEN_CONCERNING,
    "receiving_account": OPEN_CONCERNING,
    "secrecy": SECRECY_CONCERNING,
    "payment_flexibility": FLEXIBILITY_CONCERNING,
}

# Prior threshold from PREREGISTRATION.md. Tune only in A-07, with the weights.
THRESHOLD = 3


def _concerning_chip(intent: str, chip: str, *, mapped: bool) -> bool:
    table = INTENT_MAP[intent] if mapped else OPEN_CONCERNING
    return table.get(chip, True)


def run_static(scenario: Scenario, lib: Library) -> ArmResult:
    concerning = 0
    default_fired = 0
    asked: list[str] = []
    trace: list[dict[str, object]] = []
    by_intent = {item.intent: item.id for item in lib.questions}

    for intent in INTERVIEW_INTENTS:
        mapped = intent in scenario.answers
        if mapped:
            chip = scenario.answers[intent]
        else:
            chip = scenario.default
            default_fired += 1
        flag = _concerning_chip(intent, chip, mapped=mapped)
        if flag:
            concerning += 1
        qid = by_intent.get(intent, intent)
        asked.append(qid)
        trace.append(
            {
                "qid": qid,
                "intent": intent,
                "chip": chip,
                "concerning": flag,
                "default_fired": not mapped,
            }
        )

    present = set(scenario.context_chips)
    for chip_id in CONTEXT_ITEMS:
        flag = chip_id in present
        if flag:
            concerning += 1
        trace.append(
            {
                "qid": None,
                "intent": chip_id,
                "chip": chip_id if flag else None,
                "concerning": flag,
                "default_fired": False,
            }
        )

    level = "High" if concerning >= THRESHOLD else "Clear"
    return ArmResult(
        scenario_id=scenario.id,
        population=scenario.population,
        label=scenario.label,
        raw_level=level,
        score=None,
        questions=len(INTERVIEW_INTENTS),
        asked=tuple(asked),
        default_fired=default_fired,
        validator_rejections=0,
        concerning_count=concerning,
        trace=tuple(trace),
    )


def polarity_map() -> Mapping[str, Mapping[str, bool]]:
    return INTENT_MAP
