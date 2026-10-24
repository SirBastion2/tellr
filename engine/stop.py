"""Stop rule (architecture §8.4) and CHANGE-000 precedence."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from engine.eligibility import look_for_purpose
from engine.library import Library
from engine.score import (
    Tables,
    concerning_interview,
    effective,
    level,
    score,
    tables_from_library,
)

Interview = Mapping[str, Any]


def stop_check(
    st: Interview,
    n: int,
    context: Sequence[str],
    lib: Library,
    tables: Tables | None = None,
    probes: bool = True,
) -> tuple[str, str] | None:
    """§8.4: checked after each answer, against the raw level."""
    tables = tables if tables is not None else tables_from_library(lib)
    ev = effective(st["evidence"], tables)
    raw = level(score(st["evidence"], tables), tables)
    look = look_for_purpose(st.get("purpose"), lib)
    looks = {item.id: item for _pattern_id, item in lib.look_alikes}
    if look and look in looks:
        tested = (
            all(qid in st["asked"] for qid in looks[look].verifying_questions)
            or st["story_failed"]
        )
    else:
        tested = True
    probe_of = {
        chip.signal: chip.probe
        for chip in lib.context_chips
        if chip.signal and chip.probe
    }
    probed = (
        all(probe_of[sid] in st["asked"] for sid in context if sid in probe_of)
        if probes
        else True
    )
    mitigating = sum(
        1 for sid in ev if sid in tables.weights and tables.weights[sid][0] < 0
    )
    if n >= 7:
        return ("hard", "max questions")
    if raw == "High concern" and concerning_interview(ev, tables) >= 2:
        return ("recommended", "enough to escalate")
    if raw == "Clear" and n >= 3 and mitigating >= 2 and tested and probed:
        return ("recommended", "enough to proceed")
    return None


def compose_stop(
    st: Interview,
    n: int,
    context: Sequence[str],
    lib: Library,
    tables: Tables,
    cands: Sequence[str],
    probes: bool = True,
) -> dict[str, str] | None:
    """CHANGE-000: hard stop wins `kind`; `reason` names both."""
    rec = stop_check(st, n, context, lib, tables, probes)
    if rec and rec[0] == "recommended" and not cands:
        return {"kind": "hard", "reason": f"{rec[1]}; nothing left to ask"}
    if not rec and not cands:
        return {"kind": "hard", "reason": "nothing left to ask"}
    if rec:
        return {"kind": rec[0], "reason": rec[1]}
    return None


def stop(
    state: Mapping[str, Any], lib: Library, cands: Sequence[str]
) -> dict[str, str] | None:
    """engine-api-v1: §8.4 + CHANGE-000 precedence."""
    facts = state.get("_engine")
    if facts is None:
        raise ValueError("stop() expects SessionState from project()")
    tables = tables_from_library(lib)
    return compose_stop(
        facts,
        int(state.get("answers") or 0),
        list(facts.get("context") or ()),
        lib,
        tables,
        cands,
    )
