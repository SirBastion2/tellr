"""Arm B on T1–T7 reproduces the golden traces (A-06; architecture §6.4 / §13.2)."""

from __future__ import annotations

import reference_impl as ref

from eval.arms.rules import run_rules
from eval.scenarios import parse_scenario
from engine.library import load_library

from tests.eval.helpers import t_scenario

LEVEL = {"Clear": "Clear", "Caution": "Caution", "High concern": "High"}


def test_arm_b_t1_through_t7_match_reference_traces(library_dir) -> None:
    lib = load_library(library_dir)
    for case, (_pop, _context, _purpose, _answers) in ref.CASES.items():
        expected = ref.run_case(*ref.CASES[case][1:])
        result = run_rules(parse_scenario(t_scenario(case)), lib)
        asked = [row["qid"] for row in expected if row["qid"]]
        assert result.asked == asked, (case, result.asked, asked)
        assert result.raw_level == LEVEL[expected[-1]["raw"]], (
            case,
            result.raw_level,
            expected[-1]["raw"],
        )
        assert result.score == expected[-1]["score"], (case, result.score, expected[-1]["score"])
        assert result.questions == len(asked), case
        chips = [row["chip"] for row in expected if row["qid"]]
        assert [step["chip"] for step in result.trace] == chips, case
