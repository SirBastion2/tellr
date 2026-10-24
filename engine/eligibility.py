"""Eligibility in three stages (architecture §7.2). Names match reference_impl.py."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from engine.hypotheses import pattern_scores, top_pattern
from engine.library import Library
from engine.score import Tables, score, tables_from_library

Interview = Mapping[str, Any]


def look_for_purpose(purpose: str | None, lib: Library) -> str | None:
    if not purpose:
        return None
    bare = purpose.removeprefix("purpose.")
    for item in lib.purposes:
        if item.id in (purpose, f"purpose.{bare}") or item.id.removeprefix("purpose.") == bare:
            return item.verifies
    return None


def _verify_of(lib: Library) -> dict[str, str]:
    return {
        question_id: look.id
        for _pattern_id, look in lib.look_alikes
        for question_id in look.verifying_questions
    }


def _questions(lib: Library) -> dict[str, Any]:
    return {item.id: item for item in lib.questions}


def eligible(
    st: Interview, lib: Library, tables: Tables | None = None
) -> tuple[str, list[str]]:
    """§7.2: opener, then the stated story's verifying question, then ranked probes."""
    tables = tables if tables is not None else tables_from_library(lib)
    asked = list(st["asked"])
    ev = set(st["evidence"])
    questions = _questions(lib)
    if not asked:
        opener = next((item.id for item in lib.questions if item.role == "opener"), "q.purpose.open")
        return "opener", [opener]
    look = look_for_purpose(st.get("purpose"), lib)
    looks = {item.id: item for _pattern_id, item in lib.look_alikes}
    look_pattern = {item.id: pattern_id for pattern_id, item in lib.look_alikes}
    if look and look in looks and not st["story_failed"]:
        unasked = [qid for qid in looks[look].verifying_questions if qid not in asked]
        if unasked:
            return "verify", unasked[:1]
    ps = pattern_scores(ev, tables)
    verify_of = _verify_of(lib)

    def ok(qid: str) -> bool:
        question = questions[qid]
        if qid in asked or question.role == "opener":
            return False
        if question.role == "verify":
            return verify_of.get(qid) == look
        return question.pattern is None or ps.get(question.pattern, 0) > 0

    top = top_pattern(ev, tables)
    target = (
        {top} | {look_id for look_id, pattern_id in look_pattern.items() if pattern_id == top}
        if top
        else set()
    )
    demote = bool(st["story_failed"]) and score(list(ev), tables) >= tables.caution

    def potential(qid: str) -> int:
        asserted = questions[qid].asserts_on or {}
        new = [
            sid
            for outcomes in asserted.values()
            for sid in outcomes
            if sid not in ev
        ]
        return max(
            (abs(tables.weights[sid][0]) for sid in new if sid in tables.weights),
            default=0,
        )

    order = list(questions)
    cands = sorted(
        (qid for qid in questions if ok(qid)),
        key=lambda qid: (
            demote and qid in verify_of,
            0 if target & set(questions[qid].tests) else 1,
            -potential(qid),
            order.index(qid),
        ),
    )
    return "probe", cands[:12]


def candidates(state: Mapping[str, Any], lib: Library) -> tuple[str, list[str]]:
    """engine-api-v1: eligibility from a projected SessionState."""
    facts = state.get("_engine")
    if facts is None:
        raise ValueError("candidates() expects SessionState from project()")
    return eligible(facts, lib, tables_from_library(lib))
