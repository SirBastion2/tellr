"""Validator (architecture §7.5). Shared by LocalLLM and HostedLLM."""

from __future__ import annotations

import json
from collections.abc import Sequence

from engine.library import Library


def is_valid(question_id: str, candidate_ids: Sequence[str], library: Library) -> bool:
    if not question_id or question_id not in candidate_ids:
        return False
    return any(item.id == question_id for item in library.questions)


def parse_question_id(raw: object) -> str:
    """Pull next_question_id out of a model body. Anything else is a fabricated ID."""
    if isinstance(raw, dict):
        value = raw.get("next_question_id")
        return str(value) if value is not None else ""
    text = str(raw).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return text.strip().strip('"')
    if isinstance(data, dict) and data.get("next_question_id") is not None:
        return str(data["next_question_id"])
    return text
