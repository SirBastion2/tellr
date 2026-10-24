"""Shared product interview loop for arms B and C.

Imports engine/ (project, candidates, stop, rule_choice) the same way the live
API does. No HTTP, no database (architecture §3, §13).
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any

from engine import candidates, project, rule_choice
from engine.library import Library
from eval.types import ArmResult, Scenario, normalize_level

Chooser = Callable[[dict[str, Any], str, Sequence[str]], tuple[str, int]]

MAX_QUESTIONS = 7
AMOUNT_BAND = "5000_9999"


def run_product(scenario: Scenario, lib: Library, chooser: Chooser) -> ArmResult:
    events: list[dict[str, Any]] = [
        {
            "type": "SessionOpened",
            "mode": "practice",
            "amount_band": AMOUNT_BAND,
            "library_version": lib.library_version,
        },
        {"type": "ContextAdded", "chips": list(scenario.context_chips)},
    ]
    asked: list[str] = []
    trace: list[dict[str, Any]] = []
    default_fired = 0
    rejections = 0
    questions = {item.id: item for item in lib.questions}

    for _ in range(MAX_QUESTIONS):
        state = project(events, lib)
        if state.get("stop"):
            break
        stage, cands = candidates(state, lib)
        if not cands:
            break
        qid, rejected = chooser(state, stage, cands)
        rejections += rejected
        if qid not in cands:
            rejections += 1
            qid = rule_choice(cands)
        question = questions[qid]
        if question.intent in scenario.answers:
            chip = scenario.answers[question.intent]
            fired = False
        else:
            chip = scenario.default
            fired = True
            default_fired += 1
        purpose = (
            scenario.stated_purpose
            if (question.role == "opener" or question.records_purpose)
            else None
        )
        events.append(
            {
                "type": "AnswerRecorded",
                "question_id": qid,
                "chip": chip,
                "purpose": purpose,
            }
        )
        asked.append(qid)
        trace.append(
            {
                "qid": qid,
                "chip": chip,
                "intent": question.intent,
                "default_fired": fired,
                "stage": stage,
            }
        )

    state = project(events, lib)
    return ArmResult(
        scenario_id=scenario.id,
        population=scenario.population,
        label=scenario.label,
        raw_level=normalize_level(str(state["risk"]["raw_level"])),
        score=int(state["risk"]["score"]),
        questions=len(asked),
        asked=tuple(asked),
        default_fired=default_fired,
        validator_rejections=rejections,
        concerning_count=None,
        trace=tuple(trace),
    )
