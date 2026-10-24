"""A-05 step 4: prompt allowlist; notes never reach the model (§9, §10.2)."""

from __future__ import annotations

from pathlib import Path

from tests.recommenders.conftest import (
    events_to_prompt_inputs,
    load_cases,
    request_events,
)

from engine import load_library, project
from engine.prompt import ALLOWED_FIELDS, build_prompt

NOTE = "NOTE_INJECT_AGE_77_FRECKLES_JANE_DOE"
ACCOUNT = "ACC_SECRET_999"
TELLER = "Jane Doe Appearance"
AMOUNT = "5000_9999"
ROOT = Path(__file__).resolve().parents[2]


def test_prompt_contains_no_free_text() -> None:
    library = load_library(ROOT / "library")
    for case in load_cases():
        events = request_events(case)
        prefix: list[dict] = []
        for event in events:
            if event.get("type") == "AnswerRecorded":
                event = {**event, "note": NOTE}
            prefix.append(event)
            state = project(prefix, library)
            fields = events_to_prompt_inputs(prefix, state, library)
            leaked = {
                **fields,
                "note": NOTE,
                "amount_band": AMOUNT,
                "account_ref": ACCOUNT,
                "teller_name": TELLER,
                "age": 77,
            }
            assert set(fields) <= ALLOWED_FIELDS
            text = build_prompt(leaked, library)
            assert NOTE not in text
            assert ACCOUNT not in text
            assert TELLER not in text
            assert AMOUNT not in text
            assert "77" not in text
            for extra in ("note", "amount_band", "account_ref", "teller_name", "age"):
                assert extra not in ALLOWED_FIELDS
            for chip in fields["context_chips"]:
                assert chip in text
            if fields["stated_purpose"]:
                assert fields["stated_purpose"] in text
            for question_id, chip in fields["transcript"]:
                assert question_id in text
                assert chip in text
            for candidate in fields["candidates"]:
                assert candidate["id"] in text
