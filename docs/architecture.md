# Teller Copilot: Architecture

**HackPSU Fall 2026 · Architecture v1.2 · October 2026**
**Companion to:** `teller-copilot-draft.md` (Product Draft v0.1)

---

## 0. How to read this

This document specifies how Teller Copilot is built. It takes the product draft as the
requirements document and does not restate it. Where the two disagree, §18 lists the
disagreement and this document's resolution. Appendix A lists what changed between
revisions; the body describes only the current design.

Three things drove most of the decisions here:

1. **"Suggest, never decide" has to be structural, not a promise.** If a model can emit
   the risk level, then the model decides. So the model never emits the level.
2. **Two people, 24 hours.** The architecture is organized so the API contract can be
   frozen in hour 2 and both people can work without blocking each other.
3. **The evaluation is a deliverable, not a test suite.** The eval harness shares the
   scoring engine with the live app, so the numbers on the slide describe the thing in
   the demo.

Every number in §6 comes from a reference implementation of §6–§8
(`reference_impl.py`, delivered with this document), and the properties claimed for the
scoring rules were checked exhaustively over every combination of the weight table
(65,536 evidence sets), not by example.

---

## 1. Architectural drivers

Each product principle becomes a constraint with a named enforcement point. Anything
without an enforcement point is a slogan.

| # | Principle (draft §5) | Architectural constraint | Enforced at |
|---|---|---|---|
| P1 | Suggest, never decide | Risk level is computed by a pure function of recorded facts; outcome is a human-authored event; every stop except two hard limits can be declined | Reducer (§4, §6), stop rule (§8.4) |
| P2 | Trigger on transaction, not person | No age/appearance field exists in any schema; free-text notes never enter model context; stated purpose describes the transaction and never enters the score | Schema + prompt allowlist (§10.2), scorer (§6.2) |
| P3 | One question at a time | Server returns at most one question per state; no queue is exposed | `GET /sessions/{id}` (§11) |
| P4 | Non-accusatory by default | Teller-facing wording comes only from the library; the model emits no prose | Output grammar + validator (§7.4, §7.5) |
| P5 | Explain every flag | Every signal carries a canonical rationale; the displayed pattern is computed from evidence and explained by it | Signal schema (§5.5), hypothesis ranking (§7.1) |
| P6 | Predictable behavior | Model selects from a rules-filtered candidate set, by ID, under a constrained decoder | Eligibility + GBNF grammar (§7.2, §8.2) |
| P7 | Private by design | Local inference, localhost binding, no audio dependency, database-enforced append-only store | Deployment (§15), Data (§10) |

Non-functional drivers from draft §6:

- **L1 — Total time.** Low-risk path under 60 seconds. At roughly 13 seconds of human time
  per turn, a 3-question minimum, and about 6 seconds for the trigger tap and context
  chips, this leaves the system roughly **5 s per turn**.
- **L1b — Perceived responsiveness.** The budget actually built against is **≤1.5 s p95**
  between a chip tap and the next question appearing. This does **not** follow from L1,
  which is far looser. It is chosen because the teller is standing in front of a customer
  and a multi-second blank screen is dead air the teller has to fill. L1 is the stated
  requirement; L1b is the binding one, and it is a judgment call rather than a derivation.
- **L2 — Availability under demo conditions.** The system must produce a correct-shaped
  recommendation with the GPU unavailable, the model OOMed, or the network down.

L2 is why the rule engine (§7.3) is a must-have component and not a fallback bolted on
later. It is the floor the model sits on top of.

---

## 2. Key decisions

| ID | Decision | Rejected alternative | Why |
|---|---|---|---|
| D1 | Session is an append-only event log; all views are pure folds over it | Mutable session row with current state | Gives determinism, audit trail, undo, replay, and eval reuse from one mechanism |
| D2 | Risk level computed by deterministic scorer from typed evidence | Model emits level or score | P1. A model-emitted level cannot be explained, reproduced, or defended to compliance |
| D3 | Rules assert every mechanically-derivable signal; model handles only the residual | Model asserts all signals | Followed through, the residual is empty in strict mode (§7.4); the rules-only fallback is then a complete product |
| D4 | Model output is a question ID, constrained by a per-turn grammar | JSON parsed then validated | Validation catches invention after the fact; a grammar makes it unrepresentable |
| D5 | Turn 0 is a fixed opener for every session | Model picks the opener | P2 fairness ("everyone gets the same openers") and a free model warm-up window |
| D6 | Scenario answers keyed by question *intent*, not question ID | Answers keyed per question | An adaptive engine does not ask a predictable question sequence |
| D7 | Three eval arms: static questionnaire, rules-only, model-assisted | Static vs. product only | Proves the model earns its place instead of asserting it |
| D8 | Live demo mode cannot load a scenario; enforced by the database | One mode with a flag | Demo integrity is a judge-facing property, so it should be visibly structural |
| D9 | Monolith: one Python process, one SQLite file, one Vite app | Services | 24 hours, two people |
| D10 | The opener records a **stated-purpose category** as well as how the customer answered | Answer chips that record only *how* | Without it, nothing recorded distinguishes a renovation from a "safe account" transfer, so there is nothing to adapt to (§18.15) |
| D11 | Hypothesis ranking (patterns and look-alikes) is deterministic, from evidence | Model ranks patterns | The rule engine needs a ranker to be complete, and the displayed pattern must be explainable |
| D12 | Store facts; derive signals in the fold | Store derived signals alongside their inputs | A stored copy of derived data is a second source of truth that can drift |

---

## 3. System overview

```
 Browser · Vite + React · 127.0.0.1:5173
 eight routes · renders SessionState · computes nothing
        │  HTTP/JSON · one endpoint per screen
        ▼
 FastAPI · 127.0.0.1:8000 · one turn, in call order
 ┌──────────────────────────────────────────────────────────────┐
 │ 1  APPEND FACT    AnswerRecorded · ContextAdded · Truncated  │
 │ 2  REDUCER        facts → evidence → score → levels          │◀── LIBRARY (YAML)
 │                   → hypotheses → reasons        (pure fold)  │    patterns · purposes
 │ 3  ELIGIBILITY    opener / verify / probe                    │    questions · signals
 │ 4  STOP CHECK     hard: question = null · recommended: keep  │    talk tracks
 │ 5  RECOMMENDER    stage 3 only: LocalLLM / Hosted / Rules    │──▶ llama-server :8080
 │ 6  VALIDATOR      drop IDs not in the candidate set          │    3–4B · Q4 · GBNF
 │ 7  APPEND         QuestionAsked → return SessionState        │
 └───────────────────────────────┬──────────────────────────────┘
                                 ▼
                 sessions.db · SQLite · append-only

 EVAL HARNESS · imports engine/ (steps 2–6) directly · no HTTP · no database
```

Steps are numbered in call order. The reducer runs before eligibility because
eligibility reads the state the reducer produces, and the stop check runs before the
recommender so a finished interview never spends an inference. The recommender is only
consulted in eligibility stage 3, the probe stage (§7.2); the opener and the verification
stage are rules.

| Draft §9 | Here | Note |
|---|---|---|
| The library | **Library** (§5) | Schema-enforced; adds stated-purpose categories |
| The reasoning layer | **Hypothesis ranking + eligibility + recommender + validator** (§7) | Rules do three of the four jobs draft §9 gives the model (§18.17) |
| The safety layer | **Reducer** (§4, §6) + enforcement table (§9) | Not a wrapper around the model; the model is a wrapper around it |
| — | **Record** (§10) | The event log *is* the compliance story |
| — | **Eval harness** (§13) | Shares the engine; cannot drift from the product |

---

## 4. Core abstraction: event log and reducer

A session is a list of immutable events. Every view the product needs is a pure function
of that list.

```python
Event =
  | SessionOpened(ts, mode: "live"|"practice", amount_band, library_version)
  | ContextAdded(ts, chips: list[ChipId])               # additive only
  | QuestionAsked(ts, question_id, stage, source: "fixed"|"rules"|"model")
  | AnswerRecorded(ts, question_id, chip: AnswerChip,
                   purpose: PurposeId | None,           # required on the opener only
                   note: str | None)
  | ModelSignal(ts, signal_id, model_id)                # the only stored signal (below)
  | RecommendationIssued(ts, question_id, model_id, latency_ms, source)
  | ValidationRejected(ts, field, raw_value)
  | Truncated(ts, to_seq, actor)                        # undo
  | ManagerRequested(ts)
  | OutcomeRecorded(ts, outcome: Proceed|SlowDown|Escalate|Report, actor, note)
  | SessionClosed(ts)
```

```python
def project(events: list[Event], lib: Library) -> SessionState
```

**Store facts, derive signals (D12).** Only facts are stored: what the teller observed,
asked, and recorded. Every signal the rules derive from those facts is recomputed by the
fold from the pinned `library_version`. Model-asserted signals are the one exception,
because the fold cannot re-run the model, so what the model said is itself a fact and is
stored as `ModelSignal`. In strict mode there are none (§7.4).

`SessionState` is the single object every screen renders from (§11.2). The properties
this buys:

- **Determinism.** Same events plus same library version always give the same level, the
  same reasons, and the same displayed pattern.
- **Auditability.** "How the risk level changed" (draft §7.9) is not stored; it is
  recomputed by folding prefixes. Nothing to keep in sync.
- **Undo.** Tellers mis-tap. Undo appends `Truncated(to_seq)`, and the fold treats it as a
  pop: on reaching the marker it discards the live events with `seq > to_seq`, then keeps
  folding, so events appended *after* the marker are live. A second undo pops again.
  Nothing is deleted, so the record shows that the teller changed their mind. Undo
  targets the most recent teller action, whether an answer or a context chip.
- **Replay.** The offline demo fallback (draft §12) is the same log fed on a timer.
- **Eval reuse.** The harness builds event lists and folds them. No HTTP, no browser.

**What moves the score.** `ContextAdded`, `AnswerRecorded`, and `ModelSignal` add
evidence; `Truncated` changes which events are live. Context is additive (removing a chip
is only possible through undo) and model signals are concerning-only, so **within a
fold, the level can only fall at an `AnswerRecorded` step.** §6.3 relies on this.
`RecommendationIssued` contributes nothing; it is provenance. This is where P1 lives.

**Where invariants are enforced.** The command handler rejects an event before it is
appended: no `OutcomeRecorded` without an `actor`, no `SessionClosed` without a preceding
outcome, no opener answer without a `purpose`, no `ContextAdded` on a closed session. The
fold itself is total and never raises on a log it can read, because a fold that raises
turns one bad event into a session that can't be opened in history or replayed.

---

## 5. Domain model

### 5.1 Identifier convention

`pat.*` patterns · `look.*` legitimate look-alikes · `purpose.*` stated purposes ·
`q.*` questions · `sig.*` risk signals · `mit.*` mitigating evidence · `tt.*` talk
tracks · `chip.*` context chips.

IDs are stable and appear verbatim in session records, so renaming one is a migration.
Pydantic validates on boot that every referenced ID resolves; an unresolved reference is
a startup failure, not a runtime surprise.

### 5.2 Patterns and look-alikes

```yaml
- id: pat.home_repair
  name: Home repair pressure
  cover_story: Large upfront cash for a contractor
  enabled: true
  signals: [sig.cash_insistence, sig.cash_refusal_unexplained]   # characteristic only
  talk_track: tt.home_repair
  look_alikes:
    - id: look.contractor_with_estimate
      description: Paying a contractor with a signed estimate
      confirmed_by: [mit.named_counterparty, mit.written_estimate]
      refuted_by: [sig.cash_refusal_unexplained]
      verifying_questions: [q.homerepair.contractor_name, q.homerepair.estimate]

- id: pat.bank_impersonation
  name: Bank or fraud-department impersonation
  cover_story: Moving money to a safe account
  enabled: true
  signals: [sig.third_party_call, sig.secrecy_bank, sig.rushed, sig.cash_insistence]
  talk_track: tt.bank_impersonation
  look_alikes:
    - id: look.own_account_transfer
      description: Customer moving money between their own accounts
      confirmed_by: [mit.own_named_account]
      refuted_by: [sig.secrecy_bank]
      verifying_questions: [q.recipient.account_details]
```

- **`signals`** lists only signals *characteristic* of the pattern. Generic coaching
  signals (`sig.specificity_gap`, `sig.story_drift`, `sig.answer_relayed`) raise the level
  but identify no pattern. Listing them under a pattern makes a failed cover story count as
  evidence for the scam the cover story imitates: a bank-impersonation victim who claimed a
  renovation and was vague about the contractor would be shown "Looks like: home repair
  pressure."
- **`confirmed_by`** feeds the hypothesis ranking (§7.1) and is the mitigating evidence the
  look-alike contributes.
- **`refuted_by`** names evidence that rules the look-alike out. While a refuter is present,
  the look-alike's `confirmed_by` items stop counting (§6.2): a contractor "with a signed
  estimate" who won't accept a cashier's check is not that look-alike, so the rehearsed
  details are not reassurance. This is the draft's own story-drift signal (draft §7.4)
  applied to the story as a whole.
- **`verifying_questions`** is eligibility stage 2 (§7.2), and what "the story has been
  tested" means in the stop rule (§8.4).

### 5.3 Stated purpose

The opener records what the customer **says** the money is for, with one tap on a
category, in addition to how they answered.

| Category | Routes to pattern | Verifies look-alike |
|---|---|---|
| `purpose.home_repair` | `pat.home_repair` | `look.contractor_with_estimate` |
| `purpose.moving_money` | `pat.bank_impersonation` | `look.own_account_transfer` |
| `purpose.government_payment` | `pat.government_impersonation` | `look.official_fine_payment` |
| `purpose.family_help` | `pat.family_emergency` | `look.relative_spoken_directly` |
| `purpose.computer_or_refund` | `pat.tech_support` | `look.known_repair_shop` |
| `purpose.vehicle`, `purpose.gift_or_travel`, `purpose.other` | none | generic counterparty questions |

The category **routes questions and does nothing else.** It never enters the score, so
saying "home repair" is not more suspicious than saying "vehicle," and it never enters
the displayed pattern (§7.1). That separation is what lets routing handle a coached cover
story: a bank-impersonation victim coached to say "home renovation" is routed to the
contractor questions, which is exactly where a cover story without a real contractor
fails (draft §7.2's specificity follow-ups), and the screen does not then label them
"home repair pressure" on the strength of their own cover story. The category is a fact
about the transaction, so P2 holds, and the opener's wording is the same for everyone
(D5).

`purpose.vehicle` routes to no pattern because none of the five must-have patterns covers
it, even though "I'm buying a car from a friend" is one of the draft's two example cover
stories (§18.16).

### 5.4 Questions

```yaml
- id: q.purpose.open
  intent: purpose                         # eval harness keys on this, not on id
  text: What's the money for today?
  why: A neutral opener. Every customer gets this one.
  kind: open
  role: opener
  fixed_opener: true
  records_purpose: true                   # adds a row of purpose.* categories
  chips: [specific, vague, no_answer, changed, relayed_by_caller]
  asserts_on:
    specific:          [mit.purpose_specific]
    vague:             [sig.specificity_gap]
    no_answer:         [sig.specificity_gap]

- id: q.homerepair.contractor_name
  intent: counterparty_identity
  text: Who's doing the work? I might know them.
  why: A real job has a named contractor. A cover story usually doesn't.
  kind: open
  role: verify                            # asked only for the story the customer told
  pattern: pat.home_repair
  tests: [pat.home_repair, look.contractor_with_estimate]
  chips: [specific, vague, no_answer, changed, relayed_by_caller]
  asserts_on:
    specific:          [mit.named_counterparty]
    vague:             [sig.specificity_gap]
    no_answer:         [sig.specificity_gap]

- id: q.alternative.cashiers_check
  intent: payment_flexibility
  text: Would a cashier's check made out to them work instead? It's safer than carrying cash.
  why: Legitimate payees take checks. Refusing one without a reason is a coaching signature.
  kind: yes_no
  role: probe
  generic: true
  tests: [pat.home_repair, look.contractor_with_estimate,
          pat.bank_impersonation, look.own_account_transfer]
  chips: [confirmed, denied, no_answer, changed, relayed_by_caller]
  asserts_on:
    confirmed:         [mit.accepts_alternative]
    denied:            [sig.cash_refusal_unexplained]   # here "no" is the concerning answer
```

`asserts_on` is the mechanism behind D3. It is authoritative; the defaults in §5.6 apply
only to open questions that omit it, and **yes/no questions must declare it** (checked at
boot), because their polarity varies. `tests` lists the hypotheses a question's answers
bear on, and drives probe ranking (§7.2). `role` is `opener`, `verify`, or `probe`.

### 5.5 Signals and mitigating evidence

```yaml
- id: sig.secrecy_bank
  name: Told not to discuss with the bank
  family: secrecy
  weight: 22
  requires_interview: true
  rationale: Scammers warn victims the bank will try to stop them. Being told to keep
             it quiet is one of the strongest single indicators.

- id: mit.written_estimate
  name: Written estimate exists
  family: mitigating
  weight: -15
  requires_interview: true
  rationale: A real contract job normally has paperwork the customer can describe.
```

`rationale` is the only text ever shown as an explanation. The model cannot write one,
which is how P5 and P4 coexist with having a model at all. The full starting weight table
is in §6.2.

### 5.6 Answer chips

A fixed vocabulary of seven, of which each question declares at most five. The UI renders
a fixed-height row of five, so nothing reflows even though labels differ by question.

| Chip | Used on | Asserts by default |
|---|---|---|
| `specific` | Open questions | nothing; `asserts_on` names the `mit.*` |
| `vague` | Open questions | `sig.specificity_gap` |
| `no_answer` | Any | `sig.specificity_gap` on open questions; per `asserts_on` on yes/no |
| `changed` | Any | `sig.story_drift`, whenever tapped |
| `relayed_by_caller` | Any | `sig.answer_relayed` |
| `confirmed` | Yes/no | per `asserts_on` only |
| `denied` | Yes/no | per `asserts_on` only |

**`no_answer`, not `declined`.** "Declined" also means *refused the offer*, and that
reading produces wrong scenarios: "payment_flexibility: declined" looks like "refused the
cashier's check" but names the chip for "wouldn't say," which asserts a specificity gap
instead of the refusal signal. Thirty scenarios written at hour 12 will repeat that if
the name allows it.

**Yes/no polarity is per question.** `confirmed` is concerning on "has anyone asked you
to keep this quiet?" and reassuring on "would a cashier's check work instead?" That is why
yes/no chips have no defaults at all.

**`changed` always asserts story drift.** Conditioning it on an earlier answer to the same
intent would make the tap a silent no-op the first time, and a tap that does nothing is
worse than no tap. If the teller says the story changed, the story changed.

The opener is the only question with a second row: the purpose categories from §5.3.

### 5.7 Context chips

Each context chip asserts one signal and names the **probe** question that tests it. The
stop rule will not suggest Proceed while an observed chip's probe is unasked (§8.4).

| Chip | Signal | Probe |
|---|---|---|
| `chip.on_phone` | `sig.third_party_call` | `q.secrecy.told_not_to_tell` |
| `chip.someone_directing` | `sig.someone_directing` | `q.secrecy.told_not_to_tell` |
| `chip.cash_only` | `sig.cash_insistence` | `q.alternative.cashiers_check` |
| `chip.urgency_secrecy` | `sig.urgency_secrecy_mentioned` | `q.secrecy.told_not_to_tell` |
| `chip.rushed` | `sig.rushed` | none (weak on its own) |
| `chip.unusual_for_customer` | `sig.unusual_for_customer` | none (§18.9) |
| `chip.above_threshold` | none; it triggers the check (§18.6) | none |

---

## 6. Risk scoring

### 6.1 Evidence set

Evidence is the set of signal IDs the fold derives from live facts (§4). Set semantics
stop the *same* signal counting twice, for instance when two questions both assert
`sig.specificity_gap`. They do not stop *overlapping* signals counting twice: "on the
phone" as a context chip asserts `sig.third_party_call`, and "relayed by caller" as an
answer chip asserts `sig.answer_relayed`, two IDs for one phenomenon. Overlap is what the
family caps below are for.

### 6.2 Score

```
effective = evidence, minus the confirmed_by items of any look-alike whose
            refuted_by evidence is present                                  (§5.2)

raw       = clamp( Σ_families cap(Σ weights in family over effective), −45, +100 )

score     = raw              if effective contains a concerning interview signal
            min(raw, 45)     otherwise
```

A **concerning interview signal** has `requires_interview: true` and `weight > 0`. The
lower clamp is the mitigating floor itself, since mitigating is the only negative family.

The 45 cap keeps observation alone below High (60). It is keyed to the same condition as
the High gate, not to "all evidence is context," because that version is non-monotone:
six context chips sit at 45, and a *reassuring* answer (`mit.purpose_specific`) makes the
evidence no longer all-context, lifts the cap, and raises the score to 56.

**Checked exhaustively** over all 65,536 combinations of the weights below, including
refutation: adding mitigating evidence never raises the score, adding concerning evidence
never lowers it, a score of 60 or more always has a concerning interview signal, and
context-only evidence never reaches High.

| Family | Cap | Reason for the cap |
|---|---:|---|
| `third_party` | +22 | Phone call, someone directing, relayed answers are one phenomenon |
| `secrecy` | +28 | Told-not-to-tell variants overlap heavily. Set above the largest single weight in the family (22), since a cap equal to it would erase every other secrecy signal rather than discount it |
| `story_quality` | +30 | Specificity gap, drift, and script echo correlate strongly |
| `payment_channel` | +25 | Cash insistence and refusing alternatives overlap |
| `urgency` | +10 | Weak on its own, and common in legitimate rush situations |
| `mitigating` | −45 | Floor, so a prepared cover story with good paperwork cannot drive the score to the basement |

Starting weights. Every number in §6.4 comes from this table.

| Signal | Weight | Family | Interview | Asserted by |
|---|---:|---|---|---|
| `sig.third_party_call` | +14 | third_party | no | chip: on the phone |
| `sig.someone_directing` | +16 | third_party | no | chip: another person directing |
| `sig.cash_insistence` | +12 | payment_channel | no | chip: insists on cash |
| `sig.rushed` | +6 | urgency | no | chip: seems rushed |
| `sig.urgency_secrecy_mentioned` | +18 | secrecy | no | chip: mentions urgency or secrecy |
| `sig.unusual_for_customer` | +8 | story_quality | no | chip: unusual for this customer (§18.9) |
| `sig.answer_relayed` | +18 | third_party | yes | `relayed_by_caller` |
| `sig.secrecy_bank` | +22 | secrecy | yes | `confirmed` on the secrecy question |
| `sig.specificity_gap` | +18 | story_quality | yes | `vague` or `no_answer` on an open question |
| `sig.story_drift` | +12 | story_quality | yes | `changed` |
| `sig.cash_refusal_unexplained` | +14 | payment_channel | yes | `denied` on the cashier's-check offer |
| `mit.purpose_specific` | −10 | mitigating | yes | `specific` on the opener |
| `mit.named_counterparty` | −15 | mitigating | yes | `specific` on the contractor-name question |
| `mit.written_estimate` | −15 | mitigating | yes | `specific` on the estimate question |
| `mit.own_named_account` | −15 | mitigating | yes | `specific` on the receiving-account question |
| `mit.accepts_alternative` | −20 | mitigating | yes | `confirmed` on the cashier's-check offer |

These are hand-set starting values. §13.4 covers tuning them without contaminating the
evaluation.

### 6.3 Level

A cascade, so every score maps to exactly one level:

```
High concern   if score ≥ 60
Caution        else if score ≥ 25
Clear          otherwise
```

**Interview gate.** High concern requires at least one concerning interview signal. Under
§6.2 this needs no separate check, because without one the score cannot exceed 45; it is
kept as an invariant test (§9). It counts *concerning* signals because `mit.*` items also
carry `requires_interview: true`, and counting them lets evidence of innocence stand in
for evidence of concern. The same distinction governs the stop rule's corroboration count
(§8.4), which is where it actually bites.

**Hysteresis, for display only.** Each boundary has its own 10-point margin:

```
shown = High      if score ≥ 60,  or previously High and score > 50
        Caution   if score ≥ 25,  or previously Caution or High and score > 15
        Clear     otherwise
```

Per-boundary margins matter. A single rule of the form "drop a level once the score is 10
below that level's threshold" is path-dependent: from High, a score of 20 is far enough
below 60 to drop, and drops straight to Clear, skipping the Caution margin that would have
held it had it come from Caution.

Hysteresis exists so the teller's screen doesn't flicker, and that is all it may do. **The
stop rule and the recorded final level use the raw level, and the display snaps to raw
when the interview stops.** Otherwise a display-smoothing device would change the
evaluation metrics, and a legitimate customer whose score settled between 15 and 25 would
be held at Caution and questioned up to the cap.

No "wait for a new answer before dropping" condition is needed: per §4, a level can only
fall at an `AnswerRecorded` step, so a drop always coincides with a new answer.

### 6.4 Worked cases

These come from `reference_impl.py`, a reference implementation of §6–§8 running a
six-question bank (the three questions in §5.4 plus the estimate, receiving-account, and
secrecy questions). It chooses every question itself through the stages in §7.2, as the
rule engine would in arm B. Nothing in these tables was typed in, and every row was
checked against a fresh run of that file.

**T1. Legitimate contractor payment.** The customer is on the phone with the actual
contractor and wants cash.

| After | Score | Raw | Shown | Stage | Displayed | Note |
|---|---:|---|---|---|---|---|
| context: cash only, on phone | 26 | Caution | **Caution** | | Pattern unclear | The genuine signature |
| Q1 opener → `purpose.home_repair`, `specific` | 16 | Clear | **Caution** | opener | Pattern unclear | Hysteresis holds the display |
| Q2 contractor name → `specific` | 1 | Clear | **Clear** | verify | Pattern unclear | Routed by the stated purpose |
| Q3 written estimate → `specific` | −14 | Clear | **Clear** | verify | Matches: contractor with estimate | Story tested; chips not yet probed |
| Q4 told to keep it quiet? → `denied` | −14 | Clear | **Clear** | probe | Matches: contractor with estimate | Probes "on the phone" |
| Q5 cashier's check instead? → `confirmed` | −19 | Clear | **Clear** | probe | Matches: contractor with estimate | Probes "cash only". Stop (recommended): enough to proceed |

**T2. Coached bank impersonation.** The customer says they are moving money.

| After | Score | Raw | Shown | Stage | Displayed | Note |
|---|---:|---|---|---|---|---|
| context: on phone, cash only, rushed | 32 | Caution | **Caution** | | Pattern unclear | No interview signal yet, so capped at 45 |
| Q1 opener → `purpose.moving_money`, `relayed_by_caller` | 40 | Caution | **Caution** | opener | Pattern unclear | `third_party` hits its +22 cap |
| Q2 receiving account → `vague` | 58 | Caution | **Caution** | verify | Pattern unclear | The stated story fails verification |
| Q3 told to keep it quiet? → `confirmed` | 80 | High concern | **High concern** | probe | Looks like: bank impersonation | Stop (recommended): enough to escalate |

**T3. Coached bank impersonation, with a cover story.** The victim was told to say the
money is for a renovation. This is the case the product exists for (draft §2).

| After | Score | Raw | Shown | Stage | Displayed | Note |
|---|---:|---|---|---|---|---|
| context: on phone, cash only | 26 | Caution | **Caution** | | Pattern unclear | |
| Q1 opener → `purpose.home_repair`, `specific` | 16 | Clear | **Caution** | opener | Pattern unclear | The cover story |
| Q2 contractor name → `vague` | 34 | Caution | **Caution** | verify | Pattern unclear | Cover story fails; verification ends |
| Q3 told to keep it quiet? → `confirmed` | 56 | Caution | **Caution** | probe | Looks like: bank impersonation | Labelled by the true pattern, not the claimed one |
| Q4 cashier's check instead? → `denied` | 69 | High concern | **High concern** | probe | Looks like: bank impersonation | Stop (recommended): enough to escalate |

All seven reference cases:

| Case | Population | Questions | Final level | Result |
|---|---|---:|---|---|
| T1 contractor, on the phone, wants cash | legitimate | 5 | Clear | cleared |
| T2 bank impersonation, "moving money" | coached | 3 | High concern | caught |
| T3 bank impersonation, coached to say "renovation" | coached | 4 | High concern | caught |
| T4 contractor, can't recall the name, has an estimate | legitimate | 3 | Clear | cleared |
| T5 own-account transfer, no red-flag chips | legitimate | 3 | Clear | cleared |
| T6 perfectly coached: invented contractor, claims an estimate | coached | 5+ | Caution | caught |
| T7 contractor who genuinely insists on cash | legitimate | 5+ | Clear | cleared, slowly |

"5+" means the six-question bank ran out. With a full bank those two interviews continue
toward the cap, so their final levels can still move.

What they show:

- **L1 holds for genuinely low-risk sessions.** T4 and T5 take three questions, about
  45 seconds. T1 takes five, about 70 seconds, because it arrives with two red-flag chips
  and each is probed before the system will suggest Proceed.
- **That cost is what catches T6.** Without the probe requirement and look-alike
  refutation, T6 is cleared after three questions; verified by switching both off. With
  them, refusing the cashier's check refutes the contractor look-alike, the rehearsed name
  and estimate stop counting, and the score moves from −14 to 29. Whether a perfectly
  coached victim *stays* caught over a 40-question bank, where more plausible answers can
  accumulate, is something only the eval can answer.
- **T7 is an open calibration question.** Refutation leaves this legitimate customer one
  effective mitigating item, so the proceed stop never fires and they are questioned to the
  cap, even though they finish at Clear. Whether a cash-only contractor *should* produce
  Caution is a judgment for §13.4's tuning, and the eval's questions-to-decision metric
  will show it.

Boundary cases, from the same implementation:

- Every context chip, no questions: **45, Caution**. Never High.
- One context chip alone: **14, Clear**. One observation is not a flag.
- Six context chips, then a specific purpose answer: **stays 45**. Reassurance never raises
  the score.
- Six context chips, a confirmed secrecy answer, and a specific purpose answer: **66, High
  concern, with one concerning interview signal**. The interview continues looking for
  corroboration rather than stopping to escalate on a single answer (§8.4).

### 6.5 Reasons

Up to three reasons, drawn from *effective* evidence pointing the same way as the shown
level (concerning at Caution and High, mitigating at Clear), ordered by raw `|weight|` with
ties broken by ID. At most one opposite-direction item may appear on its own line,
labelled "In their favor:" at Caution or High and "Still noted:" at Clear, so nothing is
hidden, but nothing is presented as a reason *for* the level that points against it.
Because reasons use effective evidence, details refuted under §5.2 are not shown as
reassurance.

Raw rather than capped weight orders them, because caps apply per family: two
third-party items capped to 22 in total have no individual capped weight without an
arbitrary pro-rating rule.

---

## 7. Question selection

### 7.1 Hypothesis ranking (deterministic, D11)

Two rankings, kept separate because they are in different units:

- **Patterns,** by the sum of weights of their own `signals` present in effective evidence.
  Generic coaching signals are in no pattern's list (§5.2), so they raise the level without
  pointing at a pattern.
- **Look-alikes,** by how many of their `confirmed_by` items are present, if not refuted.

Ties break by library order. Stated purpose is deliberately absent (§5.3).

| Use | Rule |
|---|---|
| Displayed pattern | At Caution or High, "Looks like: ⟨pattern⟩" only if the top pattern has **at least one interview signal of its own** and leads the next by ≥ 8 points; its present signals are the explanation. At Clear, "Matches: ⟨look-alike⟩" once one has ≥ 2 confirmations. Otherwise, "Pattern unclear." |
| Talk track | Stage lines from the suggested outcome; pattern lines added only while a pattern is displayed |
| Probe ranking | The top pattern and its look-alikes (§7.2) |

The display gate mirrors the level gate. Observation alone cannot raise the level to High,
and observation alone cannot put a scam's name on a screen the customer may be able to
see. Without the gate, T1's legitimate customer reads "Looks like: bank impersonation" for
the first two turns, including right after explaining their renovation.

### 7.2 Eligibility, in three stages

```
stage 1  OPENER   no answers yet
                  → q.purpose.open                                         (D5, P2)

stage 2  VERIFY   the stated purpose has a look-alike, some of its verifying
                  questions are unasked, and none has failed (produced a
                  specificity gap or story drift)
                  → its next verifying question                            (rules)

stage 3  PROBE    candidates: unasked questions that are either
                    · probes that are generic, or whose pattern has evidence > 0
                    · verifying questions of the stated purpose's look-alike
                  ranked by
                    1. if the stated story failed and score ≥ 25,
                       its remaining verifying questions go last
                    2. tests the top pattern or one of its look-alikes
                    3. largest |weight| among its asserts_on signals not yet present
                    4. library order
                  truncated to 12                                          (model picks)
```

Stage 2 is the draft's specificity follow-ups (draft §7.2): test the story the customer
told before testing anything else. It is rules-only, so two customers who state the same
purpose and answer the same way get the same verifying questions.

The constraints in stage 3 each come from a failure in the reference cases:

- **Verifying questions only for the story the customer told.** Otherwise a contractor
  customer is asked about a receiving account, because bank impersonation is "in play"
  through the shared cash-insistence chip.
- **Demote a failed story only when the picture is already concerning.** In T3 the cover
  story has failed at 34, so the interview turns to what is behind it rather than
  re-verifying the story a second time; a question that would have added nothing. In T4,
  at 20, the estimate question is how a forgetful but legitimate customer gets cleared, so
  it is not demoted.
- **Rank by what an answer could change.** A question whose only concerning outcome is
  already present can add nothing on that side.

Pre-filtering also keeps the prompt short enough for L1b and gives the grammar a small
enumeration. (`qn`-style names in code, never `q`, because `q.` is the question ID
namespace.)

### 7.3 Rule engine (the floor, and the fallback)

The rules derive every signal they can from facts, through `asserts_on` (§5.4), the chip
table (§5.7), and these defaults:

| Signal | Derived from |
|---|---|
| The six context signals in §6.2 | Context chips, one per chip |
| `sig.specificity_gap` | `vague` or `no_answer` on an open question |
| `sig.story_drift` | `changed`, whenever tapped |
| `sig.answer_relayed` | `relayed_by_caller` |
| Yes/no signals such as `sig.secrecy_bank` and `sig.cash_refusal_unexplained` | `confirmed` or `denied`, per the question's `asserts_on` |
| `mit.*` | `specific` or `confirmed`, per the question's `asserts_on` |

`asserts_on` is authoritative and the table holds defaults, so each question has one
source of truth. In stage 3 the rule engine picks the top-ranked candidate. With the
ranker in §7.1 it is a complete implementation of the product, as §6.4 demonstrates: the
L2 fallback, eval arm B, and the thing that runs at 3am when the GPU falls over.

### 7.4 Recommender

```python
class Recommender(Protocol):
    def next(self, state: SessionState, candidates: list[Question]) -> Recommendation: ...

@dataclass(frozen=True)
class Recommendation:
    next_question_id: QuestionId          # must be in candidates
    signals_asserted: list[SignalId]      # always [] in strict mode
```

Implementations: `LocalLLM`, `HostedLLM`, `RuleEngine`, selected by config and swappable
at runtime from Settings so the demo can be moved off the GPU in one tap. The recommender
is called only in stage 3, and only when the interview has not stopped.

**No prose field.** This is the load-bearing decision for P4 and P6. Everything the
teller reads is a library lookup.

**What the model does, followed through.** The opener is fixed (D5). Stage 2 is rules.
The level is rules (D2). The hypothesis ranking is rules (D11). The only signal the rules
cannot derive, `sig.script_echo`, needs the customer's own wording, which never reaches
the model (§10.2). So in strict mode the model's entire job is choosing among ≤12
pre-ranked candidates in stage 3. That is one of the four jobs draft §9 gives it
(§18.17). Whether its choice beats the rule engine's is precisely what arms B and C
measure, and §19.2 is the principled route to giving it more. Letting it emit pattern
judgments the teller cannot check is the route P5 rules out.

### 7.5 Validator

Drops any ID not in the library or not in the candidate set, logs a `ValidationRejected`
event, and falls back to the rule engine's top candidate. The rejection count is surfaced
in dev mode and reported in the eval: "across 30 scenarios the model proposed 3 things
outside the candidate set; the validator caught 3/3" is a stronger claim to a technical
judge than any promise about guardrails.

---

## 8. Reasoning layer

### 8.1 Prompt construction

```
[ stable prefix, KV-cached across the session ]
  system contract: you select one question ID; you do not write
  answer-chip and purpose vocabularies
[ per-turn suffix, ~250 tokens ]
  context chips and stated purpose
  transcript: (question_id, chip) pairs, no free text
  current evidence IDs and the leading pattern
  candidate questions: id + one-line `why`
```

The library is not in the prompt; re-processing it every turn would blow L1b. Signal IDs
the model may assert appear in the prefix only if the optional free-text field (§10.2) is
enabled; in strict mode there are none.

**Prompt-injection surface in strict mode is zero**, because no free text reaches the
model. Teller notes are stored and excluded (§10.2).

### 8.2 Constrained decoding

A GBNF grammar generated per turn, enumerating exactly the stage-3 candidates:

```gbnf
root ::= "{" ws "\"next_question_id\":" ws qid ws "}"
qid  ::= "\"q.secrecy.told_not_to_tell\"" | "\"q.alternative.cashiers_check\"" | ...
ws   ::= [ \t\n]*
```

This makes inventing a question unrepresentable rather than merely detectable. With the
free-text option enabled, add a `signals_asserted` list with its own enumeration. The
validator stays anyway, because the hosted provider may not support grammars and defense
in depth costs twenty lines.

### 8.3 Latency budget (L1b)

| Stage | Target p95 |
|---|---:|
| Reducer, eligibility, stop check | 15 ms |
| Model prefill (cached prefix + ~250 new tokens) | 250 ms |
| Model decode (~25 tokens, grammar-constrained) | 400 ms |
| Validate, append, serialize | 25 ms |
| **Sum of stage targets** | **≈0.7 s** |

Summing per-stage p95s overstates the p95 of the total, which is the safe direction. The
output is a single ID, so decode is short, and that is most of the budget's slack. Stage 1
and stage 2 turns make no model call at all.

**Measure this at the hour-6 checkpoint (§17)** with a standalone script against
`llama-server`, a representative prompt, and a 12-way grammar. These are targets for a
3–4B Q4_K_M, not measurements. If the measured p95 exceeds 1.5 s:

1. Drop to a smaller model. Choosing among twelve options needs little capability.
2. Speculative prefetch: while the teller asks question N, submit the ≤5 chip branches as
   one batch, so the response on a tap is a cache hit. Probably unnecessary at 0.7 s, and
   it makes outputs depend on batch composition (§13.4), so add it only if measurement
   says so.
3. Fall back to the rule engine on timeout. **The timeout is the L1b budget, 1500 ms**,
   not the target. A timeout equal to the target p95 builds in a ~5% fallback rate when
   everything is working.

VRAM: a 3B Q4_K_M needs roughly 2 GB plus KV and fits a 6 GB laptop 3060 comfortably. An
8B Q4_K_M at roughly 4.7 GB plus KV is tight on 6 GB and fine on 12 GB. Its decode runs at
roughly half the 3B's speed, and prefix caching does not help with that: caching shortens
prefill, not decode. With a ~25-token output an 8B may still fit the budget, so include
it in the hour-6 benchmark. Confirm which card the demo machine actually has.

### 8.4 Stop rule

`answers` counts live `AnswerRecorded` events (after any undo). The rule is checked after
each answer, against the **raw** level (§6.3).

| Stop when | Kind | Rationale |
|---|---|---|
| `answers ≥ 7` | hard | Draft §7.2's cap; protects legitimate customers from interrogation |
| No eligible candidate | hard | Nothing left to ask |
| Raw High, and ≥ 2 concerning interview signals | recommended | Enough to escalate |
| Raw Clear, `answers ≥ 3`, ≥ 2 effective mitigating items, the stated story **tested**, and every observed chip **probed** | recommended | Enough to proceed |
| Teller taps Finish | — | Always available |

**Tested, not passed.** The stated story is tested once all its verifying questions have
been asked or one has failed. Requiring it to *pass* would mean a legitimate customer who
can't recall their contractor's name could never be cleared and would be questioned to
the cap (T4).

**Every observed chip probed** (§5.7). Without this the system suggests Proceed while a
red flag the teller tapped was never asked about, which is exactly how a perfectly coached
victim gets through (T6).

On a **hard** stop, `question` is null. On a **recommended** stop, `question` still
carries the top candidate, shown de-emphasized ("You have enough to decide, or ask one
more"), because a suggestion the teller cannot decline is not a suggestion (P1).

The escalate stop needs two answers and the proceed stop needs three plus tests and
probes. The asymmetry is deliberate. Stopping at Clear wrongly can cost a customer their
savings; stopping at High wrongly costs a manager a walk across the branch.

Off-by-one warning, because it has bitten this design twice: context chips are not
turns, and a trace's stop goes on the last question actually asked.

---

## 9. Safety and fairness enforcement

Each row is a product promise, the mechanism, and the test that fails if the mechanism is
removed. Several rows exist because an earlier revision of this design had exactly that
bug, which makes them the tests worth writing first.

| Promise | Mechanism | Test |
|---|---|---|
| Never approves or denies | No endpoint mutates a transaction; `OutcomeRecorded` requires `actor` | `test_no_outcome_without_actor` |
| Human closes every session | Command handler rejects `SessionClosed` without a prior outcome; the fold is total | `test_cannot_close_unresolved` |
| No age or appearance input | No such field in any Pydantic model; prompt builder takes an allowlist | `test_no_age_or_appearance_field`, `test_prompt_contains_no_free_text` |
| Same openers for everyone | Stage 1 returns the fixed opener whatever the chips, mode, or session | `test_opener_invariant_over_100_random_contexts` |
| Stated purpose cannot raise concern | Purpose routes questions; it never enters the score or the displayed pattern | `test_purpose_does_not_affect_score` |
| Cannot invent questions or claims | Grammar enumerates IDs; validator drops unknowns; no prose field exists | `test_validator_drops_fabricated_ids` |
| Every flag explained | A signal without a `rationale` fails boot | `test_every_signal_has_rationale` |
| Profiling cannot escalate | Score capped at 45 without a concerning interview signal | `test_context_only_never_high`, plus the exhaustive property test (§6.2) |
| Observation cannot name a scam | Displayed pattern needs an interview signal of its own | `test_display_gate` |
| Hysteresis cannot change outcomes | Stop rule and recorded level use the raw level | `test_final_level_is_raw` |
| No Proceed past an unprobed red flag | Proceed stop requires every observed chip's probe | `test_no_proceed_with_unprobed_chip` |
| No audio | No microphone permission requested; no audio dependency in the lockfile | Grep the lockfile in CI |

The seven cases in §6.4 and the four properties in §6.2 should be unit tests before
anything else is built on the engine.

---

## 10. Data and privacy

### 10.1 Storage

One SQLite file, two tables, with integrity the database enforces rather than conventions
the code is trusted to follow:

```sql
PRAGMA foreign_keys = ON;   -- per connection; without it SQLite ignores REFERENCES

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                 -- uuid4
  mode TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  library_version TEXT NOT NULL,       -- pins the fold
  account_ref TEXT,                    -- optional, policy-gated, never modelled
  scenario_id TEXT,                    -- practice only
  CHECK (mode IN ('live','practice')),
  CHECK (mode <> 'live' OR scenario_id IS NULL)       -- D8
);
CREATE TABLE events (
  session_id TEXT NOT NULL REFERENCES sessions(id),
  seq INTEGER NOT NULL,
  ts TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,               -- JSON
  PRIMARY KEY (session_id, seq)
);
CREATE TRIGGER events_no_update BEFORE UPDATE ON events
  BEGIN SELECT RAISE(ABORT, 'events are append-only'); END;
CREATE TRIGGER events_no_partial_delete BEFORE DELETE ON events
  WHEN (SELECT closed_at FROM sessions WHERE id = OLD.session_id) IS NULL
  BEGIN SELECT RAISE(ABORT, 'cannot delete events of an open session'); END;
```

Each line was checked in SQLite. The `CHECK` rejects a live session with a scenario.
Without the pragma, an event for a nonexistent session is accepted. Without the triggers,
a recorded answer can be silently rewritten with one `UPDATE`, which is not a property a
compliance reviewer would accept from an audit log.

**Append-only and retention.** Within a session's life nothing is updated or deleted;
undo appends a marker (§4). Retention purge removes whole *closed* sessions past the
window: in one transaction, delete their events, then their session rows. That order is
required, not stylistic. With foreign keys on, deleting the session row first is rejected,
and `ON DELETE CASCADE` does not help either, because by the time the cascade reaches the
events the trigger can no longer see the session row and blocks the delete.

No customer name. No age. No audio. No transcript of what the customer actually said
beyond the chips, the stated-purpose category, and the optional note.

### 10.2 What reaches the model

| Field | To model | Stored | Note |
|---|---|---|---|
| Context chips | yes | yes | Transaction facts |
| Stated-purpose category | yes | yes | Transaction fact; routes questions, never scored |
| `(question_id, chip)` pairs | yes | yes | Structured |
| Current evidence IDs, leading pattern | yes | derived | Recomputed by the fold |
| Amount band | no | yes | Triggers the check; see §18.6 |
| **Teller note (free text)** | **no** | yes | The most likely accidental route for age or appearance to reach a model |
| Account reference | no | if policy allows | |

The prompt builder takes an explicit allowlist, not an exclusion list. Adding a field to
the session schema should not silently add it to the prompt.

**Optional "in their words" field.** There is a real argument for giving the model one
short free-text line: it is the only way `sig.script_echo` becomes computable, and it is
where a language model's actual advantage lives. If it is built: default off, labelled in
the UI as going to the local model, unavailable in hosted mode, and **off for the metrics
run** so the published numbers stay reproducible. It is not in the must-have scope.

### 10.3 Modes

| Mode | Inference | Egress | Use |
|---|---|---|---|
| **Local** (default) | `llama-server` on localhost | none | Demo, and the privacy claim |
| Hosted | Provider API | Structured IDs only; notes never sent | Fallback if the GPU dies |
| Offline | Rule engine | none | Air-gapped demo, replay |

Retention is a configurable window with a purge command (§10.1). Export is explicit and
user-initiated.

---

## 11. API contract

Freeze this in hour 2. It is the interface between the two people.

### 11.1 Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/library` | Chips, purposes, talk tracks, patterns, copy. The frontend renders from this, never from hardcoded strings |
| `POST` | `/sessions` | `{mode, amount_band}` → session. Rejects `scenario_id` when `mode="live"`; the database enforces it too |
| `POST` | `/sessions/{id}/context` | `{chips: []}` **adds** chips → `SessionState`. Removal only through undo |
| `POST` | `/sessions/{id}/answers` | `{question_id, chip, purpose?, note?}` → `SessionState`. `purpose` required on the opener and rejected elsewhere |
| `POST` | `/sessions/{id}/undo` | Undo the most recent answer or chip → `SessionState` |
| `GET` | `/sessions/{id}` | → `SessionState` |
| `POST` | `/sessions/{id}/outcome` | `{outcome, actor, note?}` → `SessionState` |
| `GET` | `/sessions/{id}/handoff` | Manager summary projection |
| `GET` | `/sessions` | History, filterable, excludes `practice` by default |
| `GET` | `/health` | Recommender in use, model ID, last p95, fallback rate, rule-engine agreement rate |

### 11.2 SessionState

One response contains everything the Interview screen needs. The frontend does no
stitching and holds no derived state. This example is T2 after its second answer (§6.4).

```jsonc
{
  "session_id": "…", "mode": "live", "answers": 2, "library_version": "1.2.0",
  "stated_purpose": "purpose.moving_money",
  "risk": {
    "level": "caution",                       // shown level, hysteresis applied
    "raw_level": "caution",                   // what the stop rule and the record use
    "score": 58,
    "reasons": [                              // ≤3, same direction as level, raw |weight|
      {"id": "sig.answer_relayed",   "label": "Answer relayed by caller",  "rationale": "…"},
      {"id": "sig.specificity_gap",  "label": "Missing details",           "rationale": "…"},
      {"id": "sig.third_party_call", "label": "On the phone during visit", "rationale": "…"}
    ],
    "counterpoint": null,                     // ≤1 opposite-direction item, on its own line
    "pattern": null,                          // or {"kind": "pattern"|"look_alike", "id", "label"}
    "pattern_label": "Pattern unclear"
  },
  "question": {                               // null only on a hard stop
    "id": "q.secrecy.told_not_to_tell",
    "text": "Has anyone asked you to keep this between you and them?",
    "why": "Scammers warn victims the bank will try to stop them.",
    "kind": "yes_no",
    "chips": ["confirmed", "denied", "no_answer", "changed", "relayed_by_caller"],
    "stage": "probe", "source": "model"
  },
  "stop": null,                               // or {"kind": "hard"|"recommended", "reason": "…"}
  "talk_track": {"stage": "tt.slow_down", "pattern": null, "lines": ["…"], "avoid": ["…"]},
  "suggested_outcome": "slow_down",           // follows the shown level; never enforced
  "available_outcomes": ["proceed", "slow_down", "escalate", "report"],
  "debug": {"recommender": "local_llm", "latency_ms": 640, "rejections": 0}
}
```

`available_outcomes` is always all four, at every level. The suggestion follows the shown
level (Clear → Proceed, Caution → Slow down, High → Escalate) and only decides which
button is highlighted; nothing is disabled, because a disabled Proceed at High concern
would be the tool deciding (P1). Report is always available and never suggested, because
whether to report is a policy question the product does not answer (draft §4). `debug` is
dropped in production builds but stays on at the judging table, because showing the
latency and the rejection count is free credibility.

---

## 12. Frontend

Vite + React + TypeScript + Tailwind. Eight routes matching draft §8. No component
library; the interaction surface is large buttons.

- **One screen, one endpoint.** Every screen renders from a single `SessionState` or a
  single projection. No client-side risk logic, no client-side question choice. If a
  number appears on screen, the server computed it.
- **Two-tap opener.** Purpose categories, then how the customer answered. It is the only
  question with two rows.
- **Recommended stops are declinable.** "You have enough to decide" with the next
  question still visible underneath, de-emphasized. Hard stops show no question.
- **Level first, pattern second.** The level is what the teller acts on. The pattern
  label is the least reliable thing on the screen when a customer has been coached (T3
  reads "Pattern unclear" until its third answer), so it sits below the level, smaller.
- **Risk level never relies on colour alone.** Text label plus colour plus position
  (draft §7.5).
- **Live mode badge.** A persistent "LIVE — no scenario loaded" indicator, read from
  `mode`, so the judge can see D8 rather than being told about it.
- **Handoff is a route, not an app.** `/sessions/{id}/handoff` is a projection of the same
  log, which answers draft §15's open question about a separate manager screen: a route
  costs nothing and a separate app costs hours.

Responses target 0.7 s (§8.3), so chip taps can render optimistically and reconcile when
the state arrives.

Spanish (draft §15) is a data problem under this architecture, not a model problem: add
`text_es` and `why_es` to questions, purposes, and talk tracks. Because the model emits no
prose, a second language is a column in YAML, which is what makes it a realistic stretch
goal.

---

## 13. Evaluation harness

Imports `engine/` directly. No HTTP, no browser, no database, and no model required for
two of the three arms.

### 13.1 Scenario format (D6)

An adaptive engine does not ask a predictable sequence, so answers are keyed by
**intent**, and every scenario declares what the customer *says* the money is for:

```yaml
- id: scn.coached.bank_safe_account
  label: Coached — bank impersonation, safe-account story
  population: coached
  pattern_truth: pat.bank_impersonation
  stated_purpose: purpose.moving_money     # what they SAY; for coached scenarios, the cover story
  context_chips: [chip.on_phone, chip.cash_only, chip.rushed]
  answers:                                 # keyed by intent (D6)
    purpose: relayed_by_caller
    receiving_account: vague
    secrecy: confirmed                     # "yes, they told me not to say anything"
    payment_flexibility: denied            # refuses the cashier's check
  default: vague                           # fires when the engine asks an unmapped intent
```

`default_fired_rate` is a reported metric: if the engine often asks about intents the
scenarios don't cover, the eval is weaker than it looks and the writeup should say so.

Write the coached set to include the two shapes a static sheet cannot catch: **cover
stories** whose `stated_purpose` points at a different pattern from `pattern_truth` (T3),
and **perfectly coached** victims with plausible details for everything (T6). The seven
cases in §6.4 are the seed of the scenario set.

### 13.2 Three arms (D7)

| Arm | What it is | What it tests |
|---|---|---|
| **A — Static** | The fixed yes/no sheet from draft §2, mapped to the same intents, scored by yes-count against a threshold | The comparison the pitch is built on |
| **B — Rules-only** | Full product with `RuleEngine` as recommender | Whether adaptivity alone explains the result |
| **C — Model-assisted** | Full product with `LocalLLM` | The shipped configuration |

**Arm A's answer mapping is per question.** Scenario answers are chips and the static
sheet is yes/no, so each static question needs a fixed chip → concerning-or-not mapping
written down before the first run, and it must follow each question's polarity:
`confirmed` is concerning on a secrecy item and reassuring on "would a cashier's check
work instead?" A single global mapping would score every customer who accepts a check as
suspicious and quietly sink the baseline.

Arm B is the honest one. If C beats B by very little, that is the finding, and reporting
it is consistent with draft §11's commitment to presenting the misses. It is also the
answer to the technical judge's sharpest question, which is why there is a language model
in a system whose inputs are a handful of enumerated taps.

### 13.3 Metrics

The draft's metric pair is asymmetric in a way that is trivially gameable: catch rate
counts Caution-or-above while false-flag rate counts High only, so a system that returns
Caution for every customer scores 100% catch and 0% false flags. Fix:

**Primary — full confusion matrix**, both populations, all three levels, using the final
**raw** level at stop (§6.3):

```
                 Clear   Caution   High
  coached   (15)    ?        ?       ?
  legitimate(15)    ?        ?       ?
```

**Headline pair**, reported as counts:

- Catch rate: coached finishing at Caution or High, written like `13/15` (format, not a
  result)
- False-flag rate: legitimate finishing at High, written like `1/15`

**Secondary, because the primary pair hides it:**

- Friction rate: legitimate finishing at Caution or above
- Misses: coached finishing at Clear, each listed with the scenario that beat it
- Questions to decision, mean and max (T7 is the first place to look)
- Time to decision: questions × 13 s, plus live-path latency measured separately, since
  eval runs disable timeouts and batching (§13.4) and are not representative
- Validator rejections, and fallback rate on the live path
- `default_fired_rate`

**Trivial baselines,** to prove the headline is not an artifact: always-Clear,
always-Caution, always-High. Publishing them next to the real arms pre-empts the sharpest
reading of the metric design.

With 15 scenarios per population the uncertainty is larger than it looks. A 13/15 result
has a 95% Wilson interval of roughly 62% to 96%, so the true catch rate could be anywhere
from two-thirds to nearly all. Report `13/15`, not `86.7%`, and do not report a difference
between arms as significant on 15 scenarios. If the arm C minus arm B difference matters
to the pitch, compare the arms scenario by scenario and report which ones flipped, which
is a claim 15 samples can actually support.

### 13.4 Determinism and tuning

Scripted answers, not a model playing the customer. An LLM customer adds variance, makes
the run unreproducible, and exposes the result to the objection that the system is grading
its own homework. Temperature 0, pinned `library_version`, and the run writes
`results.json` plus a generated `report.md`. The YAML is shown in the writeup.

**Eval runs pin batch size to 1, disable prefetch, and disable the timeout.** Continuous
batching changes floating-point reduction order, so a temperature-0 model is not
reproducible across runs with different batch composition; and with a timeout, a busy GPU
changes which turns fall back to the rule engine, so arm C would vary with wall-clock
load. A seed does not fix either and is not relied on. The live path keeps its timeout,
and its fallback rate is measured there.

**Tuning without rigging the comparison.** Whatever tuning freedom one arm gets, every
arm gets. Tuning the product's weights on the 30 scenarios while holding arm A's threshold
fixed biases the headline comparison toward the product, which is the same rigging as
tuning the baseline after seeing results, pointed the other way. So: tune the weights
*and* arm A's threshold on the 30 development scenarios, and report those numbers labelled
as tuned. Then run 10 held-out scenarios, written after the freeze by whoever did not tune
the weights and run exactly once, and report them as the honest figure. With five per
population the held-out intervals are very wide, so present them as a check on
generalization, not as the headline.

---

## 14. Demo architecture

### 14.1 Live versus practice (D8)

Enforced at session creation and by the database (§10.1), not by a UI flag:

- `mode="live"` → `scenario_id` must be NULL. The live code path has no access to the
  scenario store.
- `mode="practice"` → scenario loaded, badge visible, excluded from history.

For the role-play (draft §12), the judge draws the card and answers in character; the
teller taps chips; every tap is visible on screen. Transparency about the chip mapping
beats assertion about the model, and a judge who can see the input is a judge who can
believe the output.

### 14.2 Fallbacks, in order

| Failure | Response | Prepared when |
|---|---|---|
| Model slow (> 1500 ms) | Rule engine for that turn, labelled in `debug` | Automatic |
| GPU unavailable or OOM | Switch recommender in Settings, one tap | Config |
| No network | Local mode is the default, so nothing changes | By design |
| Everything | `--replay` a recorded event log on a timer; the UI is a pure function of state, so it is pixel-identical to a live run | Record two logs the night before |

The replay fallback is nearly free because of D1. Without the event log it would be a
video.

---

## 15. Deployment and runtime

```
teller-copilot/
├── engine/                 # pure, no I/O, no FastAPI import
│   ├── events.py           # Event types, Truncated pop semantics
│   ├── reduce.py           # project(): facts → evidence
│   ├── score.py            # refutation, families, caps, levels, hysteresis
│   ├── hypotheses.py       # pattern and look-alike ranking, display gate
│   ├── eligibility.py      # opener / verify / probe
│   ├── stop.py             # hard and recommended stops
│   ├── rules.py            # RuleEngine, asserts_on and chip defaults
│   └── library.py          # Pydantic models, boot-time validation
├── recommenders/
│   ├── base.py             # Protocol
│   ├── local_llm.py        # llama.cpp client, GBNF generation
│   └── hosted_llm.py
├── api/main.py             # FastAPI, thin; command handler enforces invariants
├── store/sqlite.py         # pragma, triggers, purge
├── library/*.yaml          # patterns, purposes, questions, signals, chips, talk tracks
├── eval/
│   ├── scenarios/{dev,heldout}/*.yaml
│   ├── arms/{static,rules,model}.py
│   └── run.py              # → results.json + report.md
├── web/                    # Vite app
└── Makefile
```

`engine/` importing nothing from `api/` is what lets the eval harness and the server share
one scoring implementation. Enforce it with an import-linter rule; it takes two minutes
and prevents the one refactor nobody has time for at hour 20.

**Processes:** `llama-server` on :8080, FastAPI on :8000, Vite on :5173, all bound to
127.0.0.1. `make demo` starts all three.

**Config** via `.env`: `RECOMMENDER`, `MODEL_PATH`, `MODEL_TIMEOUT_MS=1500`,
`WITHDRAWAL_THRESHOLD=5000`, `MAX_QUESTIONS=7`, `RETENTION_DAYS`, `STRICT_MODE=true`.

---

## 16. Observability

`/health` and a dev panel expose what the demo needs to be believed: recommender in use,
model ID and quantization, per-turn latency p50/p95, fallback rate, validator rejection
count, and **agreement with the rule engine**: on every stage-3 turn, whether the model
picked the rule engine's top candidate.

Agreement is the useful version of a cruder check ("does the model always pick the first
candidate?"). The candidate list is ranked, so picking the first is often correct and
proves nothing either way. Agreement rate measures the model's actual contribution, and
it is the live version of §19.1: near 100% means the model is adding latency and nothing
else.

---

## 17. Build plan, 24 hours, two people

Contract-first. The only serialized work is hours 0–2.

| Hours | Both | Backend (A) | Frontend (B) |
|---|---|---|---|
| 0–2 | Freeze library schema (purposes, roles, probes included), `SessionState`, event types, API paths | | |
| 2–4 | | `engine/` skeleton; 5 patterns with look-alikes; purpose map; chip table; ~40 questions as YAML; boot validation | Mock server from the frozen contract; Home, Context, Interview shells |
| 4–6 | | Reducer, scorer, hypothesis ranker, starting from `reference_impl.py`; the §6.2 property tests | Interview screen against the mock, including the two-tap opener |
| 6–8 | **Checkpoint: latency benchmark** (§8.3), standalone script, 3B and 8B, choose the model | Eligibility and stop rule; rule engine end-to-end; the seven §6.4 cases as tests. **The product works with no model by hour 8** | Outcome and Handoff screens |
| 8–12 | | `LocalLLM`, GBNF generation, validator, timeout fallback | Talk-track panel, undo, Practice mode |
| 12–15 | | Eval harness, 30 development scenarios, three arms | Polish, large tap targets, colour plus text, live badge |
| 15–18 | **Checkpoint: first full eval run at hour 15**; the rest of the block is for reacting to it | | |
| 18–20 | | Tune weights *and* arm A's threshold on the development set; freeze | Session history, settings |
| 20–21 | | Once they exist, run the held-out set exactly once, frozen | **Write the 10 held-out scenarios** first (the person who did not tune) |
| 21–22 | Record two replay logs; rehearse the role-play twice | | |
| 22–24 | Devpost writeup, generated `report.md`, slides | | |

Hour 6 picks the model before `LocalLLM` work starts. By hour 8 a demoable product exists
with no model at all. Hour 15 leaves time to react if the numbers are bad, and reacting
honestly is cheaper than reacting at hour 23.

---

## 18. Issues found in the product draft

Each item is a place where the draft is internally inconsistent, would break under
implementation, or would not survive a sharp question. Draft sections are cited as
"draft §N" and draft principles as P1–P7 (§1); a bare section number always means this
document.

### 18.1 "Clear" names both a risk level and an outcome path

Draft §7.5 defines levels Clear / Caution / High concern. Draft §6 defines outcomes
Proceed / Slow down / Escalate / Report. Draft §10 then refers to "the Clear path is
fast," mixing the two.

**Resolution:** `RiskLevel` (computed, 3 values) and `Outcome` (human-authored, 4 values)
are separate types. The only mapping is advisory: it picks which button is highlighted as
`suggested_outcome`. What is forbidden is a mapping that constrains availability, so all
four outcomes are available at every level (§11.2).

### 18.2 The evaluation metrics are trivially gameable

Catch rate counts Caution-or-above; false-flag rate counts High only. A system that
outputs Caution unconditionally scores 100% and 0%.

**Resolution:** the full confusion matrix, a friction rate, trivial baselines, and counts
rather than percentages on 15-scenario arms (§13.3).

### 18.3 Signals double-count, which quietly inflates the catch rate

"Third-party presence" appears both as a context chip and as an answer chip ("checked
with someone on the phone"), and the specificity, drift, and script-echo signals describe
one phenomenon three ways.

**Resolution:** per-family caps handle overlapping signals; set semantics only stop the
*same* signal counting twice (§6.1, §6.2).

### 18.4 Nothing stopped context chips alone from reaching High concern

Draft §6 step 2 says the chips "seed the assessment," and draft §10 promises the tool
does not profile. Those conflict if chips can escalate on their own, since chips are the teller's
unaided impression.

**Resolution:** without a concerning interview signal the score is capped at 45, below
High (§6.2), and the same gate applies to putting a pattern name on screen (§7.1). Checked
exhaustively, not by example.

### 18.5 "Explain every flag" and "cannot make claims on its own" conflict if the model writes the explanation

Draft §9 says the model "can choose and explain." A model that writes explanations can
write false ones, directly against P6 and draft §10's "AI errors or made-up claims" row.

**Resolution:** every rationale is a library field, the model emits a question ID and
nothing else (§7.4), and the grammar makes fabrication unrepresentable.

### 18.6 Amount is both the trigger and a potential score input

Draft §7.1 makes the threshold a trigger. Letting the amount also drive the score would
penalize large legitimate withdrawals and reintroduce a proxy for the thing P2 forbids.

**Resolution:** the amount band triggers the check, is recorded, and does not score. The
tradeoff is real (a $40,000 cash request is more concerning than $5,000), but with a
15-scenario legitimate arm, keeping amount out of scoring is the safer side to err on.

### 18.7 The risk level can oscillate

Draft §7.5 says the level "updates after every answer," and legitimate look-alikes must
be able to bring it down. Together those permit Caution → Clear → Caution mid-conversation, a trust
problem for the person holding the screen in front of a customer.

**Resolution:** per-boundary hysteresis with a 10-point margin, for display only; the
stop rule and the record use the raw level (§6.3). In T1 it holds the display for one
turn; in general it lasts as long as the score sits inside a margin.

### 18.8 Free-text notes are an unguarded route for age and appearance

Draft §7.2 offers an optional note field and draft §7.9 stores notes. P2 and draft §4
promise the product never uses age or appearance. "Elderly woman, seemed confused" typed into a note and passed to
the model violates the promise silently.

**Resolution:** notes are stored, never sent to a model, and never transmitted in hosted
mode. The prompt builder uses a field allowlist (§10.2).

### 18.9 "The teller judges the request unusual for this customer" reimports the bias

It is the one chip that is about the person rather than the transaction.

**Resolution:** keep it, since tellers who know their customers are a real signal, but
weight it low (8), give it no probe and no pattern, and let the interview gate keep it from
reaching High on its own.

### 18.10 No offline or rules-only path is specified

Draft §9 presents the model as the reasoning layer, with no stated behavior when it is
slow or absent. At a hackathon the GPU is the single most likely thing to fail, and the
draft's own fallback plan (draft §12) is a recorded video.

**Resolution:** the rule engine, with the deterministic ranker, is a complete
implementation of the product (§7.3), as the reference cases in §6.4 demonstrate. It is
also eval arm B and the replay path.

### 18.11 The eval cannot be scripted per question

Draft §11 describes 30 scripted scenarios, but draft §7.2 describes adaptive follow-ups. The question
sequence is not knowable in advance, so answers cannot be keyed to questions.

**Resolution:** scenarios key answers by question intent, with a declared default and a
reported `default_fired_rate` (§13.1).

### 18.12 Nothing structurally prevents the live demo from seeing the scenario

Draft §12's claim is that the copilot "should land on the right outcome without knowing
which card was drawn." With one code path and a flag, that is a promise rather than a property.

**Resolution:** live sessions cannot carry a `scenario_id`, enforced by the database, and
the live path has no access to the scenario store. A visible badge makes the property
legible (§14.1).

### 18.13 Open questions from draft §15, answered

| Question | Answer | Reason |
|---|---|---|
| Default withdrawal threshold | **$5,000** | Matches the Cuyahoga pilot cited in draft §2, so the baseline comparison uses the same trigger as the thing it is compared against |
| Which five patterns | **Keep the draft's five.** Home repair especially | Home repair is where coached and legitimate scenarios collide: "it's for a home renovation" is the draft's own example of a coached cover story (draft §2) and a contractor is one of its legitimate scenarios (draft §11). That collision is where the false-flag number is won |
| Spanish in v1 | **Stretch, and genuinely achievable** | The model emits no prose, so translation is a YAML column rather than a prompting problem (§12) |
| Manager view: screen or mode | **A route on the same app** | The handoff summary is a projection of the same event log (§12) |

### 18.14 Claims to verify before the writeup

Not architecture, but load-bearing in the pitch. Two of them (the July and August 2026
items) are recent enough that they should be checked against primary sources before
anything is quoted:

- The AARP figure in draft §2 and its year
- The Cuyahoga County Scam Squad pilot details and its $5,000 threshold (draft §2, cited
  as July 2026)
- The August 2026 Ohio coaching coverage (draft §16)
- The precise scope of Senior Safe Act immunity as paraphrased in draft §7.7,
  particularly which staff count as trained and which recipients are covered

Draft §7.7's hedge ("each bank decides its own procedures") is the right posture. Keep it, cite
primary sources in the writeup, and avoid stating the legal protection more strongly than
the statute does.

### 18.15 The answer chips record how the customer answered, never what they said

Draft §7.2's chips (gave specific details, vague or unsure, declined to say, story
changed, checked with someone on the phone) carry no content, and draft §9's reasoning
layer "reads the teller's recorded answers" to decide which patterns are becoming likely. With
content-free answers there is nothing to read: a customer paying for a renovation and one
moving money to a "safe account" produce identical records, so no follow-up can depend on
which one the customer described, and "adaptive follow-ups" have nothing to adapt to.

**Resolution:** the opener records a stated-purpose category (D10, §5.3). It routes the
verification stage and never touches the score or the displayed pattern, which is what
lets a coached cover story be tested without being believed (T3).

### 18.16 "I'm buying a car from a friend" has no pattern

It is one of the draft's two example cover stories (draft §2), but none of the five
must-have patterns (draft §13) or their look-alikes covers it.

**Resolution:** `purpose.vehicle` routes to generic counterparty questions. A vehicle
pattern is the first stretch pattern worth adding, ahead of the others in the draft's
table.

### 18.17 The model's role, followed through, is narrower than draft §9 describes

Draft §9 gives the model four jobs: read the answers, judge which patterns are likely, check for
coached-answer signals, and pick the next question. Under the draft's own principles,
three of those become rules. Pattern likelihood is shown to the teller, so it must be
explainable (§5.5, §7.1). The mechanical coached-answer signals are derivable from chips
(§7.3). And the one that isn't, script echo, needs the customer's wording, which the
privacy design keeps from the model (§10.2).

**Resolution:** the model chooses among pre-ranked candidates in the probe stage, and arms
B and C measure whether that is worth its latency. The pitch should describe it that way.
§19.2 is the principled route to a bigger role.

---

## 19. Open architectural questions

### 19.1 Does the model beat the rule engine?

Measurable two ways now: arm B against arm C on identical scenarios, and the live
agreement rate (§16). If C ≈ B, the honest pitch leads with the adaptive interview and
reports the model as a component that did not yet earn its place. That is a better talk
than overclaiming.

### 19.2 Is the "in their words" field worth the privacy surface?

It is the only route to `sig.script_echo` and the only place a language model's real
advantage applies. Decide after the hour-15 numbers, not before.

### 19.3 Weight calibration

The weights are hand-set and tuned on 30 development scenarios; the held-out set (§13.4)
checks generalization but holds only five per population. T7 is the first concrete
calibration question: whether a contractor who insists on cash should finish at Caution
rather than Clear.

### 19.4 Who can see the screen?

The draft's "Looks like: bank impersonation" label (draft §7.5) is useful to the teller
and exactly the wrong thing for the customer to read, since scammers warn victims the bank
will try to stop them (P4). Screen orientation, a privacy filter, or neutral label wording
are all cheap, and the demo should show which one was chosen.

### 19.5 Multi-teller deployment

Out of scope at 24 hours. The event log makes it a routing problem rather than a rewrite;
the single shared model server becomes the bottleneck and the queue.

---

## Appendix A. Revision history

**v1.0.** Initial architecture.

**v1.1, first audit.** The escalation stop's corroboration count accepted evidence of
innocence. No answer chip could express yes/no, so the highest-weighted signal had no
asserter. Undo was specified two incompatible ways. The latency budget was presented as
derived from the 60-second target when it is a separate judgment. Continuous batching
broke the eval's determinism. Two clauses could never fire, and the secrecy cap erased
other secrecy evidence rather than discounting it. Plus nine smaller fixes, seventeen in
all.

**v1.2, second audit.** The largest findings, each now reflected in the body:

- The engine had nothing to adapt to, because answer chips recorded how and never what
  (D10, §18.15).
- The rule engine had no pattern ranker, so it was not a complete implementation, and the
  displayed pattern was an unexplained model judgment that also selected the talk track
  (D11, §7.1).
- Undo, as worded, hid every answer recorded after it.
- The second worked trace asked a question after its own stop rule had fired.
- The context-only cap let reassuring evidence raise the score, and the level table had
  no row for some scores.
- Hysteresis was path-dependent, and could change outcomes, not just the display.
- Reasons could point against the level they explained.
- The reference implementation previously scored a question sequence chosen by hand; once
  it chose questions itself, it showed that the stop rule could clear a perfectly coached
  victim without probing either red flag the teller had tapped (T6), could never clear a
  legitimate customer who failed one verification question (T4), and that a failed cover
  story counted as evidence for the scam it imitated (T3). This produced the probe
  requirement, look-alike refutation, verification-only-for-the-stated-story, and
  characteristic-only pattern signals.
- Rule-derived signals were stored as well as derived, and `SignalCleared` had no
  producer (D12).
- The eval compared a tuned product with an untuned baseline.
- Foreign keys and append-only were stated but not enforced by the database.
- Corrections to v1.1's own edits: two tables split by inserted paragraphs, nine changes
  not propagated to other sections, a worked example whose numbers went stale when a cap
  changed in the same pass, and a stop row justified by a gap that did not exist.
- Draft references in §18 that resolved to unrelated sections of this document ("§7.5
  defines levels" pointed at this document's validator); they are now always prefixed.
- Two reference cases were reported as finished when the six-question bank had simply run
  out (T6, T7); they are now marked 5+.
