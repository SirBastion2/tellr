#!/usr/bin/env python3
"""Regenerate contract/library.json and contract/fixtures/T*.json from reference_impl.py.

Never hand-edit the output. Library copy here is DRAFT and needs compliance review (draft §7.3).
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
import tempfile
# Never trust cached bytecode of the oracle: Python validates .pyc files by mtime in whole seconds
# plus size, so a same-size edit within one second would otherwise be checked against stale code.
sys.dont_write_bytecode = True
sys.pycache_prefix = tempfile.mkdtemp(prefix="tc-")
sys.path.insert(0, str(ROOT))
import reference_impl as R  # noqa: E402

CONTRACT_VERSION = "1.0.0"
LIBRARY_VERSION = "1.2.0"
OPEN_CHIPS = ["specific", "vague", "no_answer", "changed", "relayed_by_caller"]
YESNO_CHIPS = ["confirmed", "denied", "no_answer", "changed", "relayed_by_caller"]

CHIPS = [("specific", "Gave specific details", "open"), ("vague", "Vague or unsure", "open"),
         ("no_answer", "Wouldn't say", "any"), ("changed", "Story changed", "any"),
         ("relayed_by_caller", "Answer came from the caller", "any"),
         ("confirmed", "Yes", "yes_no"), ("denied", "No", "yes_no")]
PURPOSES = [("home_repair", "Home repair or contractor"), ("moving_money", "Moving money to another account"),
            ("government_payment", "Paying a government agency or fine"), ("family_help", "Helping family or a friend"),
            ("computer_or_refund", "Computer repair or a refund"), ("vehicle", "Buying a vehicle"),
            ("gift_or_travel", "Gift or travel"), ("other", "Something else")]
CONTEXT_CHIPS = [
    ("chip.on_phone", "On the phone during the transaction", "sig.third_party_call"),
    ("chip.someone_directing", "Someone else is directing them", "sig.someone_directing"),
    ("chip.cash_only", "Insists on cash", "sig.cash_insistence"),
    ("chip.urgency_secrecy", "Mentions urgency, secrecy, or being told what to say", "sig.urgency_secrecy_mentioned"),
    ("chip.rushed", "Seems rushed", "sig.rushed"),
    ("chip.unusual_for_customer", "Unusual for this customer", "sig.unusual_for_customer"),
    ("chip.above_threshold", "Cash withdrawal above the branch threshold", None)]
SIGNAL_TO_CHIP = {sig: cid for cid, _, sig in CONTEXT_CHIPS if sig}
QUESTION_COPY = {
    "q.purpose.open": ("What's the money for today?", "A neutral opener. Every customer gets this one."),
    "q.homerepair.contractor_name": ("Who's doing the work? I might know them.",
                                     "A real job has a named contractor. A cover story usually doesn't."),
    "q.homerepair.estimate": ("Do you have a written estimate from them?",
                              "Real contract work normally comes with paperwork the customer can describe."),
    "q.recipient.account_details": ("Tell me about the account it's going to. Whose name is it in, and which bank?",
                                    "Moving money between your own accounts has details a 'safe account' story lacks."),
    "q.secrecy.told_not_to_tell": ("Has anyone asked you to keep this between you and them?",
                                   "Scammers warn victims the bank will try to stop them."),
    "q.alternative.cashiers_check": ("Would a cashier's check made out to them work instead? It's safer than carrying cash.",
                                     "Legitimate payees take checks. Refusing one without a reason is a coaching signature."),
}
SIGNAL_COPY = {
    "sig.third_party_call": ("On the phone during the visit", "Scammers often stay on the line to coach the customer through the withdrawal."),
    "sig.someone_directing": ("Someone else directing them", "Another person steering the transaction can mean the customer isn't acting freely."),
    "sig.cash_insistence": ("Insists on cash", "Scams favour cash because it can't be traced or reversed."),
    "sig.rushed": ("Seems rushed", "Urgency is a pressure tactic, though it's common in ordinary errands too."),
    "sig.urgency_secrecy_mentioned": ("Mentioned urgency or secrecy", "Being told to hurry or keep quiet is a hallmark of coaching."),
    "sig.unusual_for_customer": ("Unusual for this customer", "The teller's knowledge of the customer is a real but weak signal."),
    "sig.answer_relayed": ("Answer relayed by caller", "The customer repeated what someone on the phone told them to say."),
    "sig.secrecy_bank": ("Told not to discuss with the bank", "Scammers warn victims the bank will try to stop them. Being told to keep it quiet is one of the strongest single indicators."),
    "sig.specificity_gap": ("Missing details", "A plausible purpose with none of the details a real one would have."),
    "sig.story_drift": ("Story changed", "Answers that shift between questions suggest a rehearsed story under strain."),
    "sig.cash_refusal_unexplained": ("Turned down a safer option", "Legitimate payees take checks. Refusing one without a reason is a coaching signature."),
    "mit.purpose_specific": ("Clear purpose", "The customer described the purpose in their own specific terms."),
    "mit.named_counterparty": ("Named the payee", "A real job or purchase has a named person or business behind it."),
    "mit.written_estimate": ("Written estimate exists", "A real contract job normally has paperwork the customer can describe."),
    "mit.own_named_account": ("Account in their own name", "Money moving between the customer's own accounts at a bank they chose."),
    "mit.accepts_alternative": ("Accepted a cashier's check", "Willingness to use a traceable payment is strong evidence the payee is real."),
}
PATTERN_LABELS = {"pat.home_repair": "home repair pressure", "pat.bank_impersonation": "bank impersonation"}
LOOK_LABELS = {"look.contractor_with_estimate": "contractor with estimate", "look.own_account_transfer": "own-account transfer"}
TALK_TRACKS = {
    "tt.proceed": (["Thanks for walking me through that."], []),
    "tt.slow_down": (["We see a lot of calls like this lately. Mind if I ask a couple of quick questions?",
                      "A cashier's check made out to them is safer than carrying cash.",
                      "Would you call them back on a number from your own records before we finish?"],
                     ["You're being scammed.", "Who told you to say that?"]),
    "tt.escalate": (["I'd like my manager to take a quick look. It's routine for larger cash withdrawals."],
                    ["Anything accusatory", "Anything the caller warned them the bank would say"]),
    "tt.bank_impersonation": (["Your bank will never ask you to move money to keep it safe."], []),
    "tt.home_repair": (["Reputable contractors take checks and give written estimates."], []),
}
CASE_LABELS = {
    "T1": "Contractor, on the phone, wants cash", "T2": "Bank impersonation, 'moving money'",
    "T3": "Bank impersonation, coached to say 'renovation'", "T4": "Contractor, can't recall the name, has an estimate",
    "T5": "Own-account transfer, no red-flag chips", "T6": "Perfectly coached: invented contractor, claims an estimate",
    "T7": "Contractor who genuinely insists on cash"}
LEVEL = {"Clear": "clear", "Caution": "caution", "High concern": "high"}
SUGGEST = {"clear": "proceed", "caution": "slow_down", "high": "escalate"}
SOURCE = {"opener": "fixed", "verify": "rules", "probe": "rules"}


def chips_for(qid):
    return OPEN_CHIPS if R.QUESTIONS[qid]["kind"] == "open" else YESNO_CHIPS


def library():
    return {
        "library_version": LIBRARY_VERSION,
        "copy_status": "DRAFT: compliance review required before use (draft §7.3)",
        "chips": [{"id": c, "label": l, "used_on": u} for c, l, u in CHIPS],
        "purposes": [{"id": f"purpose.{p}", "label": l} for p, l in PURPOSES],
        "context_chips": [{"id": c, "label": l, "signal": s, "probe": R.PROBES.get(s) if s else None}
                          for c, l, s in CONTEXT_CHIPS],
        "questions": [{"id": q, "intent": d["intent"], "kind": d["kind"], "role": d["role"],
                       "text": QUESTION_COPY[q][0], "why": QUESTION_COPY[q][1], "chips": chips_for(q)}
                      for q, d in R.QUESTIONS.items()],
        "signals": [{"id": s, "label": SIGNAL_COPY[s][0], "rationale": SIGNAL_COPY[s][1],
                     "direction": "mitigating" if R.W[s][0] < 0 else "concern"} for s in R.W],
        "patterns": [{"id": p, "label": PATTERN_LABELS[p]} for p in R.PATTERNS],
        "look_alikes": [{"id": l, "label": LOOK_LABELS[l], "pattern": s["pattern"]} for l, s in R.LOOKALIKES.items()],
        "talk_tracks": [{"id": t, "lines": a, "avoid": b} for t, (a, b) in TALK_TRACKS.items()],
    }


def reason(sig):
    return {"id": sig, "label": SIGNAL_COPY[sig][0], "rationale": SIGNAL_COPY[sig][1]}


def counterpoint(evidence, shown):
    want_mitigating = shown != "Clear"
    pool = [s for s in R.effective(evidence) if (R.W[s][0] < 0) == want_mitigating]
    return reason(sorted(pool, key=lambda s: (-abs(R.W[s][0]), s))[0]) if pool else None


def pattern(display):
    if display == "Pattern unclear":
        return None, "Pattern unclear"
    head, ident = display.split(": ", 1)
    if head == "Looks like":
        label = f"Looks like: {PATTERN_LABELS[ident]}"
        return {"kind": "pattern", "id": ident, "label": label}, label
    label = f"Matches: {LOOK_LABELS[ident]}"
    return {"kind": "look_alike", "id": ident, "label": label}, label


def question(qid, stage):
    text, why = QUESTION_COPY[qid]
    return {"id": qid, "text": text, "why": why, "kind": R.QUESTIONS[qid]["kind"],
            "chips": chips_for(qid), "stage": stage, "source": SOURCE[stage]}


def session_state(case, answers, evidence, shown, raw, score, display, purpose, nxt, stop):
    pat, pat_label = pattern(display)
    level = LEVEL[shown]
    stage_tt = {"clear": "tt.proceed", "caution": "tt.slow_down", "high": "tt.escalate"}[level]
    pat_tt = None
    if pat and pat["kind"] == "pattern":
        pat_tt = "tt." + pat["id"].split(".", 1)[1]
    lines = TALK_TRACKS[stage_tt][0] + (TALK_TRACKS[pat_tt][0] if pat_tt else [])
    return {
        "session_id": f"fixture-{case}",
        "mode": "practice",
        "answers": answers,
        "library_version": LIBRARY_VERSION,
        "stated_purpose": f"purpose.{purpose}" if purpose else None,
        "risk": {"level": level, "raw_level": LEVEL[raw], "score": score,
                 "reasons": [reason(s) for s in R.reasons(evidence, shown)],
                 "counterpoint": counterpoint(evidence, shown),
                 "pattern": pat, "pattern_label": pat_label},
        "question": question(*nxt) if nxt else None,
        "stop": stop,
        "talk_track": {"stage": stage_tt, "pattern": pat_tt, "lines": lines,
                       "avoid": TALK_TRACKS[stage_tt][1]},
        "suggested_outcome": SUGGEST[level],
        "available_outcomes": ["proceed", "slow_down", "escalate", "report"],
        "debug": {"recommender": "rules", "latency_ms": 0, "rejections": 0},
    }


def fixture(case):
    population, context, purpose, answers = R.CASES[case]
    rows = R.run_case(context, purpose, answers)
    steps = []
    # create: no context yet
    s0 = R.score([])
    steps.append({"endpoint": "POST /sessions", "request": {"mode": "practice", "amount_band": "5000_9999"},
                  "response": session_state(case, 0, [], R.level(s0), R.level(s0), s0,
                                            R.displayed([], R.level(s0)), None, ("q.purpose.open", "opener"), None)})
    for k, r in enumerate(rows):
        st = r["state"]
        nxt, stop = None, None
        if r["stop"]:
            kind, why = r["stop"]
            if kind == "recommended":
                stage, cands = R.eligible(st)
                if cands:
                    nxt = (cands[0], stage)
                else:                                   # CHANGE-000: the hard stop wins
                    kind, why = "hard", f"{why}; nothing left to ask"
            stop = {"kind": kind, "reason": why}
        else:
            nxt = (rows[k + 1]["qid"], rows[k + 1]["stage"])
        if r["qid"] is None:
            endpoint = "POST /sessions/{id}/context"
            request = {"chips": [SIGNAL_TO_CHIP[s] for s in context]}
        else:
            endpoint = "POST /sessions/{id}/answers"
            request = {"question_id": r["qid"], "chip": r["chip"]}
            if r["qid"] == "q.purpose.open":
                request["purpose"] = f"purpose.{purpose}"
        steps.append({"endpoint": endpoint, "request": request,
                      "response": session_state(case, k, st["evidence"], r["shown"], r["raw"], r["score"],
                                                r["display"], st["purpose"], nxt, stop)})
    return {"contract_version": CONTRACT_VERSION, "case": case, "label": CASE_LABELS[case],
            "population": population, "steps": steps}


def build():
    return library(), {c: fixture(c) for c in R.CASES}


def dump(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    lib, fx = build()
    (ROOT / "contract").mkdir(exist_ok=True)
    (ROOT / "contract" / "fixtures").mkdir(exist_ok=True)
    (ROOT / "contract" / "library.json").write_text(dump(lib))
    for case, data in fx.items():
        (ROOT / "contract" / "fixtures" / f"{case}.json").write_text(dump(data))
    print(f"wrote contract/library.json and {len(fx)} fixtures "
          f"({sum(len(f['steps']) for f in fx.values())} steps)")
