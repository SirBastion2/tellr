#!/usr/bin/env python3
"""Append demo answer climbs to web/mock/live_answers.json.

The mock cannot score. It only returns a row whose key is already in that
file. This script folds each fraud demo's context chips and teller answers
with engine.reduce.project and checks the score against reference_impl.score.
Existing keys are left untouched. Missing keys are appended from that fold.

    python3 scripts/gen_live_answers.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import reference_impl

from engine.library import load_library
from engine.reduce import project
from engine.rules import public_state
from engine.score import level as engine_level
from engine.score import score as engine_score
from engine.score import tables_from_library

OUT = ROOT / "web" / "mock" / "live_answers.json"

# Chip groups follow web/src/demo/customers.ts. Answer tuples are
# (question_id, chip, purpose or None). Expected scores are the check,
# not the recorded body: the body is project()'s public state.
CLIMBS: list[tuple[str, list[list[str]], list[tuple[str, str, str | None]], list[int]]] = [
    (
        "government-impersonation",
        [
            ["chip.on_phone"],
            ["chip.someone_directing"],
            ["chip.urgency_secrecy"],
            ["chip.cash_only", "chip.above_threshold"],
        ],
        [
            ("q.purpose.open", "relayed_by_caller", "purpose.government_payment"),
            ("q.secrecy.told_not_to_tell", "confirmed", None),
            ("q.alternative.cashiers_check", "denied", None),
            ("q.recipient.account_details", "no_answer", None),
            ("q.homerepair.contractor_name", "changed", None),
        ],
        [52, 62, 75, 93, 100],
    ),
    (
        "contractor-cash",
        [
            ["chip.on_phone"],
            ["chip.someone_directing"],
            ["chip.cash_only", "chip.above_threshold"],
            ["chip.urgency_secrecy", "chip.rushed"],
        ],
        [
            ("q.purpose.open", "relayed_by_caller", "purpose.home_repair"),
            ("q.homerepair.contractor_name", "vague", None),
            ("q.secrecy.told_not_to_tell", "confirmed", None),
        ],
        [58, 76, 86],
    ),
    (
        "romance-crypto",
        [
            ["chip.someone_directing"],
            ["chip.cash_only", "chip.above_threshold"],
            ["chip.urgency_secrecy"],
            ["chip.unusual_for_customer"],
        ],
        [
            ("q.purpose.open", "relayed_by_caller", "purpose.other"),
            ("q.alternative.cashiers_check", "denied", None),
        ],
        [60, 73],
    ),
]


def answer_key(chips: list[str], answers: list[tuple[str, str, str | None]]) -> str:
    chip_part = "|".join(sorted(chips))
    parts: list[str] = []
    for question_id, chip, purpose in answers:
        if purpose:
            parts.append(f"{question_id}:{chip}:{purpose}")
        else:
            parts.append(f"{question_id}:{chip}")
    return f"{chip_part}||{'|'.join(parts)}"


def events_for(
    lib_version: str,
    chips: list[str],
    answers: list[tuple[str, str, str | None]],
) -> list[dict]:
    log: list[dict] = [
        {"type": "SessionOpened", "mode": "live", "library_version": lib_version},
    ]
    if chips:
        log.append({"type": "ContextAdded", "chips": list(chips), "source": "observed"})
    for question_id, chip, purpose in answers:
        item: dict = {"type": "AnswerRecorded", "question_id": question_id, "chip": chip}
        if purpose:
            item["purpose"] = purpose
        log.append(item)
    return log


def main() -> int:
    lib = load_library(ROOT / "library")
    tables = tables_from_library(lib)
    recorded = json.loads(OUT.read_text())
    added = 0
    for name, groups, answers, expected in CLIMBS:
        chips: list[str] = [chip for group in groups for chip in group]
        print(name)
        for length, want in enumerate(expected, start=1):
            prefix = answers[:length]
            state = project(events_for(lib.library_version, chips, prefix), lib)
            evidence = list(state["_engine"]["evidence"])
            folded = engine_score(evidence, tables)
            reference = reference_impl.score(evidence)
            if folded != reference or folded != want or state["risk"]["score"] != want:
                print(
                    f"  MISMATCH prefix {length}: engine {folded} "
                    f"reference {reference} state {state['risk']['score']} expected {want}",
                    file=sys.stderr,
                )
                return 1
            wire = state["risk"]["level"]
            print(
                f"  {length} {want} {engine_level(want, tables)} wire={wire} "
                f"q={(state.get('question') or {}).get('id')}"
            )
            key = answer_key(chips, prefix)
            body = public_state(state)
            if key in recorded:
                if recorded[key] != body:
                    print(f"  existing key differs from engine output:\n  {key}", file=sys.stderr)
                    return 1
                continue
            recorded[key] = body
            added += 1
    text = json.dumps(recorded, separators=(",", ":"))
    OUT.write_text(text)
    print(f"added {added} keys -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
