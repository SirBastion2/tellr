"""Per-turn GBNF (architecture §8.2). Inventing an ID is unrepresentable."""

from __future__ import annotations

from collections.abc import Sequence


def generate_grammar(candidate_ids: Sequence[str]) -> str:
    if not candidate_ids:
        raise ValueError("grammar requires at least one candidate ID")
    alts = " | ".join(f'"\\"{qid}\\""' for qid in candidate_ids)
    return (
        'root ::= "{" ws "\\"next_question_id\\":" ws qid ws "}"\n'
        f"qid  ::= {alts}\n"
        "ws   ::= [ \\t\\n]*\n"
    )
