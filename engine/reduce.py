"""Event-log fold (architecture §4). Store facts, derive signals (D12)."""

from __future__ import annotations

import logging
from collections.abc import Sequence

from engine.events import (
    AnswerRecorded,
    ContextAdded,
    ModelSignal,
    SessionOpened,
    Truncated,
    UnknownEvent,
    parse_event,
)
from engine.hypotheses import displayed
from engine.library import Library, Question
from engine.score import (
    Tables,
    counterpoint,
    level,
    reasons,
    score,
    shown,
    tables_from_library,
)

log = logging.getLogger(__name__)

_LEVEL_WIRE = {"Clear": "clear", "Caution": "caution", "High concern": "high"}
_SUGGEST = {"clear": "proceed", "caution": "slow_down", "high": "escalate"}
_OPEN_GAP = {"vague": ["sig.specificity_gap"], "no_answer": ["sig.specificity_gap"]}


def signals_for(question_id: str | None, chip: str | None, lib: Library) -> list[str]:
    """§5.6, §7.3: asserts_on is authoritative; chip defaults apply only where it is silent."""
    if not question_id or not chip:
        return []
    question = next((item for item in lib.questions if item.id == question_id), None)
    if question is None:
        return []
    asserts = question.asserts_on or {}
    if chip in asserts:
        return list(asserts[chip])
    defaults = {
        "changed": ["sig.story_drift"],
        "relayed_by_caller": ["sig.answer_relayed"],
    }
    if question.kind == "open":
        defaults.update(_OPEN_GAP)
    return list(defaults.get(chip, []))


def project(events: list, lib: Library) -> dict:
    """§4, §6, §7.1: the fold. Derives signals from live facts; stores nothing derived."""
    tables = tables_from_library(lib)
    live = _live_events(events)
    evidence, facts = _fold_facts(live, lib, tables)
    return _session_state(evidence, facts, lib, tables)


def _live_events(events: Sequence[object]) -> list[tuple[int, object]]:
    live: list[tuple[int, object]] = []
    for seq, raw in enumerate(events):
        event = parse_event(raw)
        if isinstance(event, UnknownEvent):
            log.warning("skipping unknown event kind %s", event.kind)
            continue
        if isinstance(event, Truncated):
            if event.to_seq is None:
                log.warning("skipping Truncated without to_seq")
                continue
            live = [item for item in live if item[0] <= event.to_seq]
            continue
        live.append((seq, event))
    return live


def _fold_facts(
    live: Sequence[tuple[int, object]], lib: Library, tables: Tables
) -> tuple[list[str], dict]:
    chip_signal = {chip.id: chip.signal for chip in lib.context_chips}
    questions = {item.id: item for item in lib.questions}
    evidence: list[str] = []
    prev = "Clear"
    shown_lvl = "Clear"
    mode = "practice"
    library_version = lib.library_version
    purpose: str | None = None
    answers = 0

    for _seq, event in live:
        changed = False
        if isinstance(event, SessionOpened):
            if event.mode in ("live", "practice"):
                mode = event.mode
            if event.library_version:
                library_version = event.library_version
        elif isinstance(event, ContextAdded):
            for chip_id in event.chips:
                signal_id = chip_signal.get(chip_id)
                if signal_id:
                    evidence.append(signal_id)
                    changed = True
        elif isinstance(event, AnswerRecorded):
            evidence.extend(signals_for(event.question_id, event.chip, lib))
            answers += 1
            if event.purpose and _records_purpose(event.question_id, questions):
                purpose = event.purpose
            changed = True
        elif isinstance(event, ModelSignal) and event.signal_id:
            evidence.append(event.signal_id)
            changed = True
        if changed:
            shown_lvl = shown(prev, score(evidence, tables), tables)
            prev = shown_lvl

    return evidence, {
        "mode": mode,
        "library_version": library_version,
        "stated_purpose": purpose,
        "answers": answers,
        "shown": shown_lvl,
    }


def _records_purpose(question_id: str | None, questions: dict[str, Question]) -> bool:
    if question_id is None:
        return True
    question = questions.get(question_id)
    if question is None:
        return True
    return question.role == "opener" or question.records_purpose


def _session_state(
    evidence: list[str], facts: dict, lib: Library, tables: Tables
) -> dict:
    raw_score = score(evidence, tables)
    raw_lvl = level(raw_score, tables)
    shown_lvl = facts["shown"]
    signals = {item.id: item for item in lib.signals}

    def reason_obj(signal_id: str) -> dict[str, str]:
        item = signals.get(signal_id)
        if item is None:
            return {"id": signal_id, "label": signal_id, "rationale": ""}
        return {"id": item.id, "label": item.name, "rationale": item.rationale}

    display = displayed(evidence, shown_lvl, tables)
    pattern, pattern_label = _pattern_view(display, lib)
    wire = _LEVEL_WIRE[shown_lvl]
    opposite = counterpoint(evidence, shown_lvl, tables)
    return {
        "session_id": "",
        "mode": facts["mode"],
        "answers": facts["answers"],
        "library_version": facts["library_version"],
        "stated_purpose": facts["stated_purpose"],
        "risk": {
            "level": wire,
            "raw_level": _LEVEL_WIRE[raw_lvl],
            "score": raw_score,
            "reasons": [reason_obj(sid) for sid in reasons(evidence, shown_lvl, tables)],
            "counterpoint": reason_obj(opposite) if opposite else None,
            "pattern": pattern,
            "pattern_label": pattern_label,
        },
        "question": None,
        "stop": None,
        "talk_track": {"stage": "", "pattern": None, "lines": [], "avoid": []},
        "suggested_outcome": _SUGGEST[wire],
        "available_outcomes": ["proceed", "slow_down", "escalate", "report"],
    }


def _pattern_view(display: str, lib: Library) -> tuple[dict | None, str]:
    if display == "Pattern unclear":
        return None, "Pattern unclear"
    head, ident = display.split(": ", 1)
    if head == "Looks like":
        pattern = next((item for item in lib.patterns if item.id == ident), None)
        label = (pattern.label or pattern.name) if pattern else ident
        view = {"kind": "pattern", "id": ident, "label": f"Looks like: {label}"}
        return view, view["label"]
    look = next((item for _pid, item in lib.look_alikes if item.id == ident), None)
    label = (look.label or ident) if look else ident
    view = {"kind": "look_alike", "id": ident, "label": f"Matches: {label}"}
    return view, view["label"]
