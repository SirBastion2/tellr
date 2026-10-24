# Event log contract

Source: architecture §4. Stored facts only (D12): rule-derived signals are recomputed by the fold.

```
SessionOpened(ts, mode, amount_band, library_version)
ContextAdded(ts, chips)                       # additive only
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
