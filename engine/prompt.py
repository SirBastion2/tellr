"""Prompt builder. Allowlist only; notes and free text never reach a model (§8.1, §10.2)."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

ALLOWED_FIELDS = frozenset(
    {
        "context_chips",
        "stated_purpose",
        "transcript",
        "evidence_ids",
        "leading_pattern",
        "candidates",
    }
)


def stable_prefix(library: Any) -> str:
    """KV-cached system contract plus chip and purpose vocabularies (§8.1)."""
    lines = [
        "SYSTEM CONTRACT",
        "You select one question ID. You do not write.",
        "Reply with JSON only: {\"next_question_id\": \"<one candidate id>\"}.",
        "",
        "ANSWER-CHIP VOCABULARY",
    ]
    for chip in getattr(library, "chips", ()) or ():
        lines.append(f"- {chip.id}: {chip.label}")
    lines += ["", "STATED-PURPOSE VOCABULARY"]
    for purpose in getattr(library, "purposes", ()) or ():
        lines.append(f"- {purpose.id}: {purpose.label}")
    return "\n".join(lines) + "\n\n"


def _candidate_line(item: Any) -> str:
    if hasattr(item, "id"):
        return f"- {item.id}: {getattr(item, 'why', '')}"
    if isinstance(item, Mapping):
        return f"- {item.get('id', '')}: {item.get('why', '')}"
    return f"- {item}"


def turn_suffix(fields: Mapping[str, Any]) -> str:
    chips = [str(item) for item in (fields.get("context_chips") or ())]
    purpose = fields.get("stated_purpose")
    lines = [
        "Context chips: " + ", ".join(chips),
        "Stated purpose: " + (str(purpose) if purpose else "none"),
        "Transcript:",
    ]
    for pair in fields.get("transcript") or ():
        question_id, chip = pair[0], pair[1]
        lines.append(f"- ({question_id}, {chip})")
    evidence = [str(item) for item in (fields.get("evidence_ids") or ())]
    lines.append("Evidence: " + ", ".join(evidence))
    pattern = fields.get("leading_pattern")
    lines.append("Leading pattern: " + (str(pattern) if pattern else "unclear"))
    lines.append("Candidates:")
    lines.extend(_candidate_line(item) for item in (fields.get("candidates") or ()))
    lines.append("Answer:")
    return "\n".join(lines)


def build_prompt(fields: Mapping[str, Any], library: Any) -> str:
    """Drop every key outside ALLOWED_FIELDS, then render prefix + suffix."""
    allowed = {key: fields[key] for key in ALLOWED_FIELDS if key in fields}
    return stable_prefix(library) + turn_suffix(allowed)
