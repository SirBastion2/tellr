"""Prompt construction (architecture §8.1, §10.2). Allowlist in; notes never in."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from engine.library import Library

PROMPT_ALLOWLIST = frozenset(
    {
        "context_chips",
        "stated_purpose",
        "transcript",
        "evidence_ids",
        "leading_pattern",
        "candidates",
        "answer_chip_vocabulary",
        "purpose_vocabulary",
    }
)


def _live_events(events: Sequence[Mapping[str, Any]]) -> list[Mapping[str, Any]]:
    """Same Truncated pop as engine.reduce._live_events, on raw dicts."""
    live: list[tuple[int, Mapping[str, Any]]] = []
    for seq, event in enumerate(events):
        if event.get("type") == "Truncated":
            to_seq = event.get("to_seq")
            if to_seq is None:
                continue
            live = [item for item in live if item[0] <= int(to_seq)]
            continue
        live.append((seq, event))
    return [event for _seq, event in live]


def prompt_fields_from_session(
    state: Mapping[str, Any],
    events: Sequence[Mapping[str, Any]],
    library: Library,
    candidate_ids: Sequence[str],
) -> dict[str, Any]:
    """Lift only the §10.2 allowlist from the session. Notes are ignored."""
    context_chips: list[str] = []
    transcript: list[tuple[str, str]] = []
    for event in _live_events(events):
        kind = event.get("type")
        if kind == "ContextAdded":
            context_chips.extend(str(chip) for chip in (event.get("chips") or ()))
        elif kind == "AnswerRecorded":
            question_id = event.get("question_id")
            chip = event.get("chip")
            if question_id and chip:
                transcript.append((str(question_id), str(chip)))

    bag = state.get("_engine") or {}
    evidence = list(bag.get("evidence") or ())
    if not evidence:
        evidence = [str(item["id"]) for item in (state.get("risk") or {}).get("reasons") or [] if item.get("id")]

    pattern = (state.get("risk") or {}).get("pattern") or {}
    leading = pattern.get("id") if isinstance(pattern, Mapping) else None

    by_id = {item.id: item for item in library.questions}
    candidates = [
        (qid, (by_id[qid].why if qid in by_id else ""))
        for qid in candidate_ids
    ]
    return {
        "context_chips": context_chips,
        "stated_purpose": state.get("stated_purpose"),
        "transcript": transcript,
        "evidence_ids": evidence,
        "leading_pattern": leading,
        "candidates": candidates,
        "answer_chip_vocabulary": [(item.id, item.label) for item in library.chips],
        "purpose_vocabulary": [(item.id, item.label) for item in library.purposes],
    }


def build_prompt(fields: Mapping[str, Any]) -> str:
    extra = set(fields) - PROMPT_ALLOWLIST
    if extra:
        raise ValueError(f"fields not on the §10.2 allowlist: {sorted(extra)}")
    return _prefix(fields) + _suffix(fields)


def _prefix(fields: Mapping[str, Any]) -> str:
    lines = [
        "SYSTEM CONTRACT",
        "You select one question ID from the candidate list. You do not write",
        "questions, answers, or free text. You do not assess risk.",
        'Reply with JSON only: {"next_question_id": "<one candidate id>"}.',
        "",
        "ANSWER-CHIP VOCABULARY",
    ]
    for ident, label in fields.get("answer_chip_vocabulary") or ():
        lines.append(f"- {ident}: {label}")
    lines += ["", "STATED-PURPOSE VOCABULARY"]
    for ident, label in fields.get("purpose_vocabulary") or ():
        lines.append(f"- {ident}: {label}")
    lines.append("")
    return "\n".join(lines) + "\n"


def _suffix(fields: Mapping[str, Any]) -> str:
    chips = ", ".join(str(item) for item in (fields.get("context_chips") or ()))
    purpose = fields.get("stated_purpose")
    evidence = ", ".join(str(item) for item in (fields.get("evidence_ids") or ()))
    leading = fields.get("leading_pattern")
    lines = [
        f"Context chips: {chips}",
        f"Stated purpose: {purpose}",
        "Transcript:",
    ]
    for question_id, chip in fields.get("transcript") or ():
        lines.append(f"- ({question_id}, {chip})")
    lines.append(f"Evidence: {evidence}")
    lines.append(f"Leading pattern: {leading}")
    lines.append("Candidates:")
    for ident, why in fields.get("candidates") or ():
        lines.append(f"- {ident}: {why}")
    return "\n".join(lines) + "\n"
