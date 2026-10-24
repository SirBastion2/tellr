"""Per-turn GBNF over candidate question IDs (architecture §8.2)."""

from __future__ import annotations

from collections.abc import Sequence


def gbnf_for(candidate_ids: Sequence[str]) -> str:
    """Enumerate exactly these IDs. Inventing any other ID is unrepresentable."""
    alts = " | ".join(f'"\\"{item}\\""' for item in candidate_ids)
    return (
        'root ::= "{" ws "\\"next_question_id\\":" ws qid ws "}"\n'
        f"qid  ::= {alts}\n"
        "ws   ::= [ \\t\\n]*\n"
    )
