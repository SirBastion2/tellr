# Decisions (drivers only)

| When | Decision | Choice | Why | Who |
|---|---|---|---|---|
| Hour 2 | CHANGE-001 and CHANGE-002 (contract-v1 still open) | CHANGE-001 rejected; CHANGE-002 accepted with an exhaustive code list | Settings stay a boot flag plus read-only `GET /health`. B needs a closed 409 body derived from the §4 command-handler invariants; 422 stays for malformed bodies. Driver B has not ticked contract-v1. | Driver A |
| Hour 6 | Model size, from A-03's measured p95 | | | |
| Hour 8 | Works end to end with no model? | | | |
| Hour 15 | Do the numbers hold up? Pitch change? | | | |
| Hour 20 | Weights frozen; held-out runs once | | | |

### Hour 2 · CHANGE-001 · Settings endpoint — REJECTED (Driver A)
No `GET`/`POST /settings` in v1. The recommender is selected by a boot flag. The Settings
screen reads `GET /health` and does not write. Recorded 2026-10-24.

### Hour 2 · CHANGE-002 · Error response shape — ACCEPTED (Driver A)
Rejected commands return `409 {"error":{"code","message"}}`. `code` is exhaustive, not
"such as", and is derived from the §4 command-handler invariants (plus the matching
§11.1 rejects): `outcome_requires_actor`, `close_without_outcome`,
`purpose_required_on_opener`, `purpose_not_allowed`, `session_closed`,
`scenario_on_live_session`. Malformed bodies return 422. Applied to `contract/api.md` and
`contract/error.schema.json`. Recorded 2026-10-24.
