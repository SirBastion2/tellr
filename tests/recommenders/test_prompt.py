"""A-05 step 4 / §9: prompt contains no free text and only the §10.2 allowlist."""

from __future__ import annotations

import pytest

from engine import candidates, project
from engine.library import Library

from tests.recommenders.conftest import NOTE_CANARY, events_from_steps, load_cases

FORBIDDEN_LABELS = (
    "amount_band",
    "account_ref",
    "account reference",
    "teller note",
    "age",
    "appearance",
)


def test_prompt_contains_no_free_text(library: Library) -> None:
    from engine.prompt import PROMPT_ALLOWLIST, build_prompt, prompt_fields_from_session

    for case in load_cases():
        for end in range(1, len(case["steps"]) + 1):
            events = events_from_steps(case["steps"][:end], inject_note=NOTE_CANARY)
            state = project(events, library)
            _stage, cands = candidates(state, library)
            fields = prompt_fields_from_session(state, events, library, cands)
            assert set(fields) <= PROMPT_ALLOWLIST
            assert "note" not in fields
            assert "amount_band" not in fields
            prompt = build_prompt(fields)
            assert NOTE_CANARY not in prompt
            lowered = prompt.lower()
            for label in FORBIDDEN_LABELS:
                assert label not in lowered, f"{case['case']} step {end}: {label!r} in prompt"
            opened = next(
                event for event in events if event["type"] == "SessionOpened"
            )
            assert opened["amount_band"] not in prompt

            with pytest.raises(ValueError, match="allowlist"):
                build_prompt({**fields, "note": NOTE_CANARY})
