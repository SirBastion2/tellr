"""
Teller Copilot: reference implementation of architecture v1.2, sections 6-8.

Every worked case and boundary number in section 6.4 of the architecture document
is produced by this file, and the scoring properties claimed in section 6.2 are
checked here exhaustively. It is deliberately tiny: two patterns, two look-alikes,
and a six-question bank. It is not the product. It is the spec, executable, and
the natural seed for engine/ and its unit tests.

    python reference_impl.py
"""
from itertools import combinations

# ---------------------------------------------------------------- weights (§6.2)
# signal: (weight, family, requires_interview)
W = {
    "sig.third_party_call":          (+14, "third_party",     False),
    "sig.someone_directing":         (+16, "third_party",     False),
    "sig.cash_insistence":           (+12, "payment_channel", False),
    "sig.rushed":                    (+6,  "urgency",         False),
    "sig.urgency_secrecy_mentioned": (+18, "secrecy",         False),
    "sig.unusual_for_customer":      (+8,  "story_quality",   False),
    "sig.answer_relayed":            (+18, "third_party",     True),
    "sig.secrecy_bank":              (+22, "secrecy",         True),
    "sig.specificity_gap":           (+18, "story_quality",   True),
    "sig.story_drift":               (+12, "story_quality",   True),
    "sig.cash_refusal_unexplained":  (+14, "payment_channel", True),
    "mit.purpose_specific":          (-10, "mitigating",      True),
    "mit.named_counterparty":        (-15, "mitigating",      True),
    "mit.written_estimate":          (-15, "mitigating",      True),
    "mit.own_named_account":         (-15, "mitigating",      True),
    "mit.accepts_alternative":       (-20, "mitigating",      True),
}
CAPS = {"third_party": 22, "secrecy": 28, "story_quality": 30,
        "payment_channel": 25, "urgency": 10, "mitigating": -45}
CAUTION, HIGH, MARGIN, OBSERVATION_CAP, DISPLAY_LEAD = 25, 60, 10, 45, 8
CONTEXT_SIGNALS = [s for s, (_, _, iv) in W.items() if not iv]

# ---------------------------------------------------------------- library (§5)
PATTERNS = {  # characteristic signals only (§5.2); dict order is library order
    "pat.home_repair":        ["sig.cash_insistence", "sig.cash_refusal_unexplained"],
    "pat.bank_impersonation": ["sig.third_party_call", "sig.secrecy_bank",
                               "sig.rushed", "sig.cash_insistence"],
}
LOOKALIKES = {
    "look.contractor_with_estimate": dict(
        pattern="pat.home_repair",
        confirmed_by=["mit.named_counterparty", "mit.written_estimate"],
        refuted_by=["sig.cash_refusal_unexplained"],
        verify=["q.homerepair.contractor_name", "q.homerepair.estimate"]),
    "look.own_account_transfer": dict(
        pattern="pat.bank_impersonation",
        confirmed_by=["mit.own_named_account"],
        refuted_by=["sig.secrecy_bank"],
        verify=["q.recipient.account_details"]),
}
PURPOSES = {"home_repair": "look.contractor_with_estimate",
            "moving_money": "look.own_account_transfer",
            "vehicle": None, "gift_or_travel": None, "other": None}
OPEN_GAP = {"vague": ["sig.specificity_gap"], "no_answer": ["sig.specificity_gap"]}
QUESTIONS = {
    "q.purpose.open": dict(
        intent="purpose", kind="open", role="opener", pattern=None, tests=[],
        asserts_on={"specific": ["mit.purpose_specific"], **OPEN_GAP}),
    "q.homerepair.contractor_name": dict(
        intent="counterparty_identity", kind="open", role="verify", pattern="pat.home_repair",
        tests=["pat.home_repair", "look.contractor_with_estimate"],
        asserts_on={"specific": ["mit.named_counterparty"], **OPEN_GAP}),
    "q.homerepair.estimate": dict(
        intent="written_estimate", kind="open", role="verify", pattern="pat.home_repair",
        tests=["pat.home_repair", "look.contractor_with_estimate"],
        asserts_on={"specific": ["mit.written_estimate"], **OPEN_GAP}),
    "q.recipient.account_details": dict(
        intent="receiving_account", kind="open", role="verify", pattern="pat.bank_impersonation",
        tests=["pat.bank_impersonation", "look.own_account_transfer"],
        asserts_on={"specific": ["mit.own_named_account"], **OPEN_GAP}),
    "q.secrecy.told_not_to_tell": dict(
        intent="secrecy", kind="yes_no", role="probe", pattern="pat.bank_impersonation",
        tests=["pat.bank_impersonation", "look.own_account_transfer"],
        asserts_on={"confirmed": ["sig.secrecy_bank"]}),
    "q.alternative.cashiers_check": dict(
        intent="payment_flexibility", kind="yes_no", role="probe", pattern=None,
        tests=["pat.home_repair", "look.contractor_with_estimate",
               "pat.bank_impersonation", "look.own_account_transfer"],
        asserts_on={"confirmed": ["mit.accepts_alternative"],
                    "denied": ["sig.cash_refusal_unexplained"]}),
}
PROBES = {  # §5.7: observed context signal -> the question that tests it
    "sig.cash_insistence": "q.alternative.cashiers_check",
    "sig.third_party_call": "q.secrecy.told_not_to_tell",
    "sig.someone_directing": "q.secrecy.told_not_to_tell",
    "sig.urgency_secrecy_mentioned": "q.secrecy.told_not_to_tell",
}
VERIFY_OF = {q: look for look, spec in LOOKALIKES.items() for q in spec["verify"]}
REFUTATION = True   # switched off only to reproduce the counterfactual in §6.4


def signals_for(qid, chip):
    """§5.6, §7.3: asserts_on is authoritative; chip defaults apply only where it is silent."""
    q = QUESTIONS[qid]
    if chip in q["asserts_on"]:
        return list(q["asserts_on"][chip])
    defaults = {"changed": ["sig.story_drift"], "relayed_by_caller": ["sig.answer_relayed"]}
    if q["kind"] == "open":
        defaults.update(OPEN_GAP)
    return defaults.get(chip, [])


# ---------------------------------------------------------------- scoring (§6)
def effective(evidence):
    """§6.2: while a look-alike's refuter is present, its confirmations stop counting."""
    ev = set(evidence)
    if REFUTATION:
        for spec in LOOKALIKES.values():
            if any(r in ev for r in spec["refuted_by"]):
                ev -= set(spec["confirmed_by"])
    return ev


def concerning_interview(ev):
    return sum(1 for s in ev if W[s][2] and W[s][0] > 0)


def score(evidence):
    ev = effective(evidence)
    fam = {}
    for s in ev:
        fam[W[s][1]] = fam.get(W[s][1], 0) + W[s][0]
    raw = sum(max(t, CAPS[f]) if CAPS[f] < 0 else min(t, CAPS[f]) for f, t in fam.items())
    raw = max(-45, min(100, raw))
    return raw if concerning_interview(ev) else min(raw, OBSERVATION_CAP)


def level(s):
    return "High concern" if s >= HIGH else "Caution" if s >= CAUTION else "Clear"


ORDER = ["Clear", "Caution", "High concern"]


def shown(prev, s):
    """§6.3: per-boundary hysteresis, display only."""
    if s >= HIGH or (prev == "High concern" and s > HIGH - MARGIN):
        return "High concern"
    if s >= CAUTION or (prev in ("Caution", "High concern") and s > CAUTION - MARGIN):
        return "Caution"
    return "Clear"


def reasons(evidence, lvl):
    """§6.5: up to three, same direction as the level, by raw |weight|, ties by ID."""
    want_mitigating = lvl == "Clear"
    pool = [s for s in effective(evidence) if (W[s][0] < 0) == want_mitigating]
    return sorted(pool, key=lambda s: (-abs(W[s][0]), s))[:3]


# ---------------------------------------------------------------- hypotheses (§7.1)
def pattern_scores(evidence):
    ev = effective(evidence)
    return {p: sum(W[s][0] for s in sigs if s in ev) for p, sigs in PATTERNS.items()}


def top_pattern(evidence):
    ps = pattern_scores(evidence)
    in_play = [p for p in PATTERNS if ps[p] > 0]
    return max(in_play, key=lambda p: ps[p]) if in_play else None   # first wins ties


def displayed(evidence, lvl):
    ev = effective(evidence)
    if lvl == "Clear":
        counts = {l: sum(1 for m in s["confirmed_by"] if m in ev) for l, s in LOOKALIKES.items()}
        best = max(counts, key=lambda l: counts[l])
        return f"Matches: {best}" if counts[best] >= 2 else "Pattern unclear"
    ps = pattern_scores(evidence)
    top, runner_up = sorted(PATTERNS, key=lambda p: -ps[p])[:2]
    own_interview_signal = any(s in ev and W[s][2] for s in PATTERNS[top])
    if own_interview_signal and ps[top] - ps[runner_up] >= DISPLAY_LEAD:
        return f"Looks like: {top}"
    return "Pattern unclear"


# ---------------------------------------------------------------- eligibility (§7.2)
def eligible(st):
    asked, ev = st["asked"], set(st["evidence"])
    if not asked:
        return "opener", ["q.purpose.open"]
    look = PURPOSES.get(st["purpose"])
    if look and not st["story_failed"]:
        unasked = [q for q in LOOKALIKES[look]["verify"] if q not in asked]
        if unasked:
            return "verify", unasked[:1]
    ps = pattern_scores(ev)

    def ok(qid):
        q = QUESTIONS[qid]
        if qid in asked or q["role"] == "opener":
            return False
        if q["role"] == "verify":
            return VERIFY_OF[qid] == look                      # only the story they told
        return q["pattern"] is None or ps[q["pattern"]] > 0     # probes: generic, or in play

    top = top_pattern(ev)
    target = ({top} | {l for l, s in LOOKALIKES.items() if s["pattern"] == top}) if top else set()
    demote = st["story_failed"] and score(ev) >= CAUTION

    def potential(qid):
        new = [s for out in QUESTIONS[qid]["asserts_on"].values() for s in out if s not in ev]
        return max((abs(W[s][0]) for s in new), default=0)

    order = list(QUESTIONS)
    cands = sorted((q for q in QUESTIONS if ok(q)),
                   key=lambda q: (demote and q in VERIFY_OF,
                                  0 if target & set(QUESTIONS[q]["tests"]) else 1,
                                  -potential(q), order.index(q)))
    return "probe", cands[:12]


# ---------------------------------------------------------------- stop rule (§8.4)
def stop_check(st, n, context, probes=True):
    ev = effective(st["evidence"])
    raw = level(score(st["evidence"]))
    look = PURPOSES.get(st["purpose"])
    tested = (all(v in st["asked"] for v in LOOKALIKES[look]["verify"]) or st["story_failed"]
              if look else True)
    probed = all(PROBES[s] in st["asked"] for s in context if s in PROBES) if probes else True
    mitigating = sum(1 for s in ev if W[s][0] < 0)
    if n >= 7:
        return ("hard", "max questions")
    if raw == "High concern" and concerning_interview(ev) >= 2:
        return ("recommended", "enough to escalate")
    if raw == "Clear" and n >= 3 and mitigating >= 2 and tested and probed:
        return ("recommended", "enough to proceed")
    return None


# ---------------------------------------------------------------- one session
def run_case(context, purpose, answers, default="vague", probes=True):
    """Answers are keyed by intent (D6); unmapped intents get the scenario default."""
    st = dict(asked=[], evidence=list(context), purpose=None, story_failed=False)
    s = score(st["evidence"])
    prev = level(s)
    rows = [dict(step="context", qid=None, chip=None, stage="", score=s, raw=prev, shown=prev,
                 display=displayed(st["evidence"], prev), stop=None, state=_snap(st))]
    for n in range(1, 8):
        stage, cands = eligible(st)
        if not cands:
            rows[-1]["stop"] = rows[-1]["stop"] or ("hard", "nothing left to ask")
            break
        qid = cands[0]
        q = QUESTIONS[qid]
        chip = answers.get(q["intent"], default)
        if q["role"] == "opener":
            st["purpose"] = purpose
        sigs = signals_for(qid, chip)
        st["asked"].append(qid)
        st["evidence"] += sigs
        if q["role"] == "verify" and {"sig.specificity_gap", "sig.story_drift"} & set(sigs):
            st["story_failed"] = True
        s = score(st["evidence"])
        raw = level(s)
        sh = shown(prev, s)
        stop = stop_check(st, n, context, probes)
        if stop:
            sh = raw                                   # display snaps to raw at stop
        rows.append(dict(step=f"Q{n}", qid=qid, chip=chip, stage=stage, score=s, raw=raw,
                         shown=sh, display=displayed(st["evidence"], sh), stop=stop,
                         state=_snap(st)))
        prev = sh
        if stop:
            break
    return rows


def _snap(st):
    return dict(asked=list(st["asked"]), evidence=list(st["evidence"]),
                purpose=st["purpose"], story_failed=st["story_failed"])


def summary(rows):
    """(questions asked, final raw level, whether the six-question bank ran out)."""
    asked = sum(1 for r in rows if r["qid"])
    exhausted = bool(rows[-1]["stop"] and rows[-1]["stop"][1] == "nothing left to ask")
    return asked, rows[-1]["raw"], exhausted


# ---------------------------------------------------------------- the seven cases (§6.4)
ON_PHONE, CASH, RUSHED = "sig.third_party_call", "sig.cash_insistence", "sig.rushed"
CASES = {
    "T1": ("legitimate", [CASH, ON_PHONE], "home_repair",
           dict(purpose="specific", counterparty_identity="specific", written_estimate="specific",
                payment_flexibility="confirmed", secrecy="denied")),
    "T2": ("coached", [ON_PHONE, CASH, RUSHED], "moving_money",
           dict(purpose="relayed_by_caller", receiving_account="vague", secrecy="confirmed",
                payment_flexibility="denied")),
    "T3": ("coached", [ON_PHONE, CASH], "home_repair",
           dict(purpose="specific", counterparty_identity="vague", written_estimate="vague",
                secrecy="confirmed", payment_flexibility="denied")),
    "T4": ("legitimate", [CASH], "home_repair",
           dict(purpose="specific", counterparty_identity="vague", written_estimate="specific",
                payment_flexibility="confirmed", secrecy="denied")),
    "T5": ("legitimate", [], "moving_money",
           dict(purpose="specific", receiving_account="specific", payment_flexibility="confirmed",
                secrecy="denied")),
    "T6": ("coached", [ON_PHONE, CASH], "home_repair",
           dict(purpose="specific", counterparty_identity="specific", written_estimate="specific",
                payment_flexibility="denied", secrecy="denied")),
    "T7": ("legitimate", [CASH], "home_repair",
           dict(purpose="specific", counterparty_identity="specific", written_estimate="specific",
                payment_flexibility="denied", secrecy="denied")),
}


def verdict(population, final):
    if population == "coached":
        return "caught" if final != "Clear" else "MISSED"
    return "cleared" if final == "Clear" else "friction"


# ---------------------------------------------------------------- properties (§6.2, §6.3)
def check_properties():
    ids = sorted(W)
    neg = [s for s in ids if W[s][0] < 0]
    pos = [s for s in ids if W[s][0] > 0]
    bad = {"mitigating never raises the score": 0, "concerning never lowers the score": 0,
           "score >= 60 implies a concerning interview signal": 0,
           "context-only evidence never reaches High": 0,
           "reasons never point against the level": 0}
    subsets = 0
    for k in range(len(ids) + 1):
        for ev in combinations(ids, k):
            subsets += 1
            ev = list(ev)
            s = score(ev)
            bad["mitigating never raises the score"] += sum(
                1 for m in neg if m not in ev and score(ev + [m]) > s)
            bad["concerning never lowers the score"] += sum(
                1 for p in pos if p not in ev and score(ev + [p]) < s)
            if s >= HIGH and not concerning_interview(effective(ev)):
                bad["score >= 60 implies a concerning interview signal"] += 1
            if ev and all(x in CONTEXT_SIGNALS for x in ev) and level(s) == "High concern":
                bad["context-only evidence never reaches High"] += 1
            for lvl in ORDER:
                r = reasons(ev, lvl)
                if any((W[x][0] < 0) != (lvl == "Clear") for x in r):
                    bad["reasons never point against the level"] += 1
    for s in range(-45, 101):
        for prev in ORDER:
            if ORDER.index(shown(prev, s)) < ORDER.index(level(s)):
                bad.setdefault("hysteresis never shows below raw", 0)
                bad["hysteresis never shows below raw"] += 1
        if ORDER.index(shown("High concern", s)) < ORDER.index(shown("Caution", s)):
            bad.setdefault("hysteresis is path-independent", 0)
            bad["hysteresis is path-independent"] += 1
    bad.setdefault("hysteresis never shows below raw", 0)
    bad.setdefault("hysteresis is path-independent", 0)
    return subsets, bad


if __name__ == "__main__":
    for name, (pop, ctx, purpose, ans) in CASES.items():
        rows = run_case(ctx, purpose, ans)
        n, final, exhausted = summary(rows)
        print(f"{name} {pop:<10} {n}{'+' if exhausted else ''} questions, final {final:<12} "
              f"{verdict(pop, final)}")
        for r in rows:
            stop = f"  <- {r['stop'][0]}: {r['stop'][1]}" if r["stop"] else ""
            label = r["step"] if not r["qid"] else f"{r['step']} [{r['stage']}] {r['qid']} -> {r['chip']}"
            print(f"    {label:<58} {r['score']:>4}  {r['raw']:<12} {r['shown']:<12} {r['display']}{stop}")
    subsets, bad = check_properties()
    print(f"\nproperties over {subsets:,} evidence sets:")
    for k, v in bad.items():
        print(f"    {'PASS' if v == 0 else 'FAIL'}  {k}  ({v})")
