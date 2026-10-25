# API contract

**CONTRACT_VERSION 2.0.0.** Tag `contract-v2` on merge. Source: architecture §11.1.
Every response that returns a session returns a full `SessionState`
(`session_state.schema.json`).

| Method | Path | Request | Response |
|---|---|---|---|
| `GET` | `/library` | — | `Library` (`library.schema.json`) |
| `POST` | `/sessions` | `{mode, amount_band}`; rejects `scenario_id` when `mode = "live"` | `SessionState` (answers 0, opener next) |
| `POST` | `/sessions/{id}/context` | `{chips: [chip.*], source?}`, **additive**; `source` is `"observed"` or `"teller"` (default `"teller"`); removal only through undo | `SessionState` |
| `POST` | `/sessions/{id}/answers` | `{question_id, chip, purpose?, note?}`; `purpose` required on the opener, rejected elsewhere | `SessionState` |
| `POST` | `/sessions/{id}/undo` | — (undoes the most recent answer or chip) | `SessionState` |
| `GET` | `/sessions/{id}` | — | `SessionState` |
| `POST` | `/sessions/{id}/outcome` | `{outcome, actor, note?}` | `SessionState` |
| `GET` | `/sessions/{id}/handoff` | — | Manager summary projection (`handoff.schema.json`, CHANGE-004 applied) |
| `GET` | `/sessions/{id}/activity` | — | `{ session_id, rows: [{ ts, channel, amount_band, type }] }` (`activity.schema.json`, CHANGE-005 applied) |
| `GET` | `/sessions` | filters; excludes `practice` by default | list |
| `GET` | `/health` | — | recommender, model ID, last p95, fallback rate, agreement rate (read-only; set at boot) |

## Clarifications (see CHANGES.md)

- **Stop precedence (CHANGE-000, applied).** When a recommended stop and a hard stop hold at once,
  `stop.kind` is `hard`, `stop.reason` names both, and `question` is null. The suggested outcome
  still follows the level.
- **Settings (CHANGE-001, rejected).** No `GET`/`POST /settings`. The recommender is a boot flag.
  `GET /health` is the read-only view.
- **Errors (CHANGE-002, applied).** Rejected commands return `409` with
  `{"error": {"code", "message"}}` (`error.schema.json`). Exhaustive `code` values:
  `outcome_requires_actor`, `close_without_outcome`, `purpose_required_on_opener`,
  `purpose_not_allowed`, `session_closed`, `scenario_on_live_session`. Malformed bodies
  return `422`.
- **T2 source of truth (CHANGE-003 / Q-004).** Architecture §11.2's example is
  illustrative. `contract/fixtures/T2.json` from `reference_impl.py` is the oracle
  (`mode` practice, `question.source` rules, `debug.recommender` rules). Cross-field
  rules (`question` is null only on a hard stop; reasons share the level's direction)
  live in `scripts/check_contract.py`. `debug`, when present, is exactly
  `{recommender, latency_ms, rejections}`.
- **Interview composition (CHANGE-003 / Q-005, Q-010).** The Interview screen renders
  `SessionState` plus copy from `GET /library` plus the client's last posted context
  chips and purpose. SessionState does not carry observed chips, chip labels,
  purpose-category rows, `amount_band`, outcome, actor, closed, or an undo flag. B
  loads chip and purpose labels from `GET /library` and keeps posted context chips in
  client memory. `stop.reason` stays machine-readable (`enough to escalate`,
  `enough to proceed; nothing left to ask`); teller-facing stop copy is not in v1.
- **Library is a UI projection (CHANGE-003 / Q-007, Q-008).** `library.schema.json` is
  the display subset B renders from, not the §5 fold library. `library.json` is T1–T7
  display copy (two of five §5.3 patterns). A loads the real backend library.
- **Untyped projections (CHANGE-003 / Q-006, deferred).** Request/response schemas for
  history, health, and POST enums (`amount_band`, `outcome`, `actor`, `chip`,
  `scenario_id`) remain a follow-up CHANGE. Session and Interview work do not wait
  on them. Only the handoff part of Q-006 is resolved.
- **Handoff projection (CHANGE-004, applied).** `GET /sessions/{id}/handoff` is
  typed as `handoff.schema.json`. `outcome` and `actor` are null until
  `POST /outcome`. Resolves the handoff part of Q-006 only.
- **Explanation, context source, activity (CHANGE-005, applied; contract-v2).**
  SessionState may include optional nullable `explanation` and optional
  `context_chips: [{id, source}]` (`source` is `"observed"` or `"teller"`).
  Both are absent or null/empty on T1–T7 fixtures. `POST /sessions/{id}/context`
  may send optional `source` (one value for that additive batch; default
  `"teller"`). `GET /sessions/{id}/activity` is a read-only projection
  (`activity.schema.json`): `{ session_id, rows: [{ ts, channel, amount_band,
  type }] }`. Rows come only from that session's stored events (`amount_band`
  from `SessionOpened`; `channel` and `type` from context chips and other
  stored events). No free text. Unknown session → `404`. Known session with
  nothing to project → `200` and `rows: []`. Activity is not fed to the model
  or the scorer. A Figma-based UI does not change this: the API stays
  UI-agnostic.
- **Outcome and handoff appends (CHANGE-003 / Q-009, Q-011).** A valid
  `POST /sessions/{id}/outcome` appends `OutcomeRecorded` then `SessionClosed`.
  `GET /sessions/{id}/handoff` appends `ManagerRequested` and returns the manager
  summary projection. `session_id` is store-assigned. `debug.recommender` is process
  settings (boot flag + `GET /health`). After undo, a model-chosen next question
  requires a new `RecommendationIssued`. Notes and outcome are not projected onto
  SessionState in v1. Undo, outcome, and live fixture steps land after A-04;
  `reference_impl.py` does not emit them.

## Fixtures

`fixtures/T*.json` hold, for each reference case, every request in order and the exact
`SessionState` the API must return. They are generated by `scripts/gen_fixtures.py` from
`reference_impl.py`. B's mock replays them; A's `tests/api/test_contract.py` must reproduce them.
