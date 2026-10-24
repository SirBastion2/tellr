"""A-05 step 1: generated GBNF enumerates exactly the candidate IDs."""

from __future__ import annotations

import random
import re

from recommenders.grammar import gbnf_for

_QID = re.compile(r'"\\"([^\\"]+)\\""')


def _ids_in_grammar(text: str) -> list[str]:
    qid_line = next(line for line in text.splitlines() if line.startswith("qid"))
    return _QID.findall(qid_line)


def test_grammar_matches_section_8_2_shape() -> None:
    text = gbnf_for(["q.secrecy.told_not_to_tell", "q.alternative.cashiers_check"])
    assert 'root ::= "{" ws "\\"next_question_id\\":" ws qid ws "}"' in text
    assert 'ws   ::= [ \\t\\n]*' in text or "ws   ::= [ \\t\\n]*" in text
    assert "qid  ::=" in text


def test_grammar_enumerates_exactly_the_candidate_ids() -> None:
    rng = random.Random(20261024)
    pool = [
        "q.secrecy.told_not_to_tell",
        "q.alternative.cashiers_check",
        "q.homerepair.contractor_name",
        "q.homerepair.estimate",
        "q.recipient.account_details",
        "q.purpose.open",
        "q.rand.alpha",
        "q.rand.beta",
        "q.rand.gamma",
        "q.bench.extra_01",
        "q.bench.extra_02",
        "q.bench.extra_03",
    ]
    for _ in range(40):
        size = rng.randint(1, len(pool))
        candidates = rng.sample(pool, size)
        text = gbnf_for(candidates)
        found = _ids_in_grammar(text)
        assert found == candidates
        assert set(found) == set(candidates)
        extras = set(_QID.findall(text)) - set(candidates)
        assert extras == set()
