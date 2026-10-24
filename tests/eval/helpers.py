"""Helpers for eval-harness tests. Not production code."""

from __future__ import annotations

import reference_impl as ref

SIGNAL_TO_CHIP = {
    "sig.third_party_call": "chip.on_phone",
    "sig.someone_directing": "chip.someone_directing",
    "sig.cash_insistence": "chip.cash_only",
    "sig.urgency_secrecy_mentioned": "chip.urgency_secrecy",
    "sig.rushed": "chip.rushed",
    "sig.unusual_for_customer": "chip.unusual_for_customer",
}

PATTERN_FOR_COACHED = {
    "T2": "pat.bank_impersonation",
    "T3": "pat.bank_impersonation",
    "T6": "pat.bank_impersonation",
}


def t_scenario(case: str) -> dict:
    """§13.1 scenario dict for a §6.4 reference case. Built in tests, not from held-out."""
    population, context, purpose, answers = ref.CASES[case]
    return {
        "id": f"scn.{population}.{case.lower()}",
        "label": f"{case} {population}",
        "population": population,
        "pattern_truth": PATTERN_FOR_COACHED.get(case),
        "stated_purpose": f"purpose.{purpose}",
        "context_chips": [SIGNAL_TO_CHIP[sid] for sid in context],
        "answers": dict(answers),
        "default": "vague",
        "tags": [f"seed.{case}"],
        "source": f"architecture §6.4 {case}",
    }
