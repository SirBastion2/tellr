# Contract changes

**CONTRACT_VERSION: 1.0.0**

Protocol: WORKFLOW.md §5. Fixtures are regenerated, never hand-edited. After applying a change, run
`python3 scripts/check_contract.py --rehash`.

### CHANGE-000 · Stop precedence · applied in 1.0.0
Architecture §8.4 doesn't say what happens when a recommended stop and the empty-candidate hard stop
coincide. Resolution: the hard stop wins `kind`; `reason` names both; `question` is null. This
keeps §11.2's rule that `question` is null only on a hard stop. Appears in T1's final step.

### CHANGE-001 · Settings endpoint · rejected
`GET /settings` / `POST /settings` will not ship in v1. Architecture §11.1 has no settings
write path. Settings are read-only through `GET /health` (recommender, model ID, last p95,
fallback rate, agreement rate) plus a boot flag that selects the recommender. B-06 shows
`/health` read-only; the fallback switch is config-only.
Decision: Rejected ☑ · signed off by Driver A ☑ · Driver B ☑ (both drivers agree to reject for v1)

### CHANGE-002 · Error response shape · applied in 1.0.0
Rejected commands return `409 {"error": {"code", "message"}}` (`error.schema.json`).
`code` is an exhaustive enum derived from the §4 command-handler invariants and the
matching §11.1 rejects (not an open "such as" list):

| code | Rejects |
|---|---|
| `outcome_requires_actor` | `OutcomeRecorded` without an `actor` |
| `close_without_outcome` | `SessionClosed` without a preceding outcome |
| `purpose_required_on_opener` | opener `AnswerRecorded` without a `purpose` |
| `purpose_not_allowed` | `purpose` on a non-opener answer |
| `session_closed` | `ContextAdded` (or any append) on a closed session |
| `scenario_on_live_session` | `scenario_id` when `mode = "live"` |

Malformed bodies return 422.
Approved: Driver A ☑ · Driver B ☑ · Rejected ☐

### CHANGE-003 · Q-004–Q-011 clarifications · applied in 1.0.0
Driver A accepted every one-line recommendation. Applied: constrain `debug` to
`{recommender, latency_ms, rejections}`; T2 fixtures stay the `reference_impl.py`
oracle; Interview = SessionState + `GET /library` + client-posted chips/purpose;
`library.schema.json` / `library.json` are the UI / T1–T7 display projection;
`POST /outcome` appends `SessionClosed`; `GET /handoff` appends `ManagerRequested`;
`session_id` is store-assigned; `debug.recommender` is process settings; the model
re-issues after undo; notes/outcome stay off SessionState; `stop.reason` stays
machine-readable. Deferred: handoff/history/health/POST-enum schemas (follow-up
CHANGE); undo/outcome/live fixtures (A-04 — `reference_impl.py` cannot emit them).
Approved: Driver A ☑ · Driver B ☑ · Rejected ☐

### CHANGE-004 · Handoff projection schema · applied in 1.0.0
`GET /sessions/{id}/handoff` is typed as `contract/handoff.schema.json`. The object
is the manager summary the live API returns today (`session_id`, `mode`,
`stated_purpose`, `risk`, `suggested_outcome`, `answers`, `stop`) plus `outcome`
and `actor`. Both are null until recorded; both are populated after
`POST /outcome`. This resolves the handoff part of Q-006 only. History, health,
and POST-enum schemas (`amount_band`, `outcome`, `actor`, `chip`, `scenario_id`)
stay deferred. SessionState still omits `outcome` and `actor` (Q-005 / Q-010 /
Q-011).
Approved: Driver A ☑ · Driver B ☑ · Rejected ☐

### Approval of contract-v1
Driver A ☑ · Driver B ☑
