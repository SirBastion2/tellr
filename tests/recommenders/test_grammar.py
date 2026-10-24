"""A-05 step 1: generated GBNF enumerates exactly the candidate IDs (§8.2)."""

from __future__ import annotations

import random
import re

_QID = re.compile(r'"\\"([^\\"]+)\\""')


def test_grammar_enumerates_exactly_candidate_ids() -> None:
    from recommenders.grammar import generate_grammar

    rng = random.Random(20261024)
    for _ in range(40):
        n = rng.randint(1, 12)
        ids = [f"q.rand.{rng.randrange(1_000_000)}.{i}" for i in range(n)]
        grammar = generate_grammar(ids)
        listed = _QID.findall(grammar)
        assert listed == ids
        assert 'root ::= "{" ws "\\"next_question_id\\":" ws qid ws "}"' in grammar
        assert "ws   ::= [ \\t\\n]*" in grammar
        for qid in ids:
            assert qid in grammar
        assert "q.not.in.set" not in grammar
