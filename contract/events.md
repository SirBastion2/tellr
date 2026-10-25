# Event log contract

Source: architecture §4. Stored facts only (D12): rule-derived signals are recomputed by the fold.

```
SessionOpened(ts, mode, amount_band, library_version)
ContextAdded(ts, chips, source?)              # additive only; source: observed | teller (default teller)
QuestionAsked(ts, question_id, stage, source) # source: fixed | rules | model
AnswerRecorded(ts, question_id, chip, purpose | None, note | None)
ModelSignal(ts, signal_id, model_id)          # the only stored signal; none in strict mode
RecommendationIssued(ts, question_id, model_id, latency_ms, source)
ValidationRejected(ts, field, raw_value)
Truncated(ts, to_seq, actor)                  # undo
ManagerRequested(ts)
OutcomeRecorded(ts, outcome, actor, note)
SessionClosed(ts)
```

**Undo is a pop.** When the fold reaches `Truncated(to_seq)`, it discards the live events with
`seq > to_seq` and keeps folding. Events appended after the marker are live. Nothing is deleted.

**What moves the score:** `ContextAdded`, `AnswerRecorded`, `ModelSignal`, and `Truncated` (which
changes what is live). Within a fold, the level can only fall at an `AnswerRecorded` step.

**The fold is total.** Invariants are enforced by the command handler before append.

**API appends (CHANGE-003 / Q-009).** A valid `POST /sessions/{id}/outcome` appends
`OutcomeRecorded` then `SessionClosed`. `GET /sessions/{id}/handoff` appends
`ManagerRequested` and returns the manager summary projection. Undo, outcome, and
live traces are not in the T1–T7 fixtures; they land after A-04 because
`reference_impl.py` does not emit those steps.

**SessionState projection (CHANGE-003 / Q-011).** `session_id` is assigned by the
store, not carried on §4 events. `debug.recommender` is process settings (boot flag
plus `GET /health`), not a log fact. After `Truncated`, a model-chosen next question
requires a new `RecommendationIssued`; the fold does not re-run the model. Notes and
outcome/actor/closed are not projected onto SessionState in v1. `seq` is implied by
log order (`Truncated.to_seq`); it is not a field on the union.

**Context source (CHANGE-005 (b), applied).** `ContextAdded` is
`ContextAdded(ts, chips, source?)` with `source: "observed" | "teller"`. When
`source` is absent, the fold treats it as `"teller"`. `POST /sessions/{id}/context`
may send the same optional `source` on the request (one value for that additive
batch); omit it and the event is teller-sourced. Score, reasons, and eligibility
ignore `source` (observed and teller chips assert the same signals). SessionState
may echo live chips as optional `context_chips: [{id, source}]`.
