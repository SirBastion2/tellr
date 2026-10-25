# Decisions (drivers only)

| When | Decision | Choice | Why | Who |
|---|---|---|---|---|
| Hour 2 | CHANGE-001 and CHANGE-002 (contract-v1 still open) | CHANGE-001 rejected; CHANGE-002 accepted with an exhaustive code list | Settings stay a boot flag plus read-only `GET /health`. B needs a closed 409 body derived from the §4 command-handler invariants; 422 stays for malformed bodies. Driver B has not ticked contract-v1. | Driver A |
| Hour 2 | Q-004–Q-011 (CHANGE-003) | each one-line recommendation accepted; Q-006 and Q-009 deferred | Driver A accepted every recommended resolution. Schemas and copy that can land in v1 are recorded; handoff/history/health schemas and undo/outcome/live fixtures wait. | Driver A |
| Hour 6 | Model size, from A-03's measured p95 | Meta-Llama-3.1-8B-Instruct Q4_K_M | A-03 HANDOFF: 8B total p95 482.7 ms vs 3B 296.3 ms; both under the 1.5 s L1b limit and the ~0.7 s target. 8B uses about 7.4 of 8 GB VRAM on the RTX 5070 Laptop. Quality unmeasured; 3B is the fallback. Driver B co-signed. | Driver A (Sebastian), Driver B (Jonathan) |
| Hour 8 | Works end to end with no model? | Yes, end to end with RECOMMENDER=rules | B-03 (PR #21) walked T1 and T2 against A's real API on main; every SessionState matched the fixtures except store-assigned session_id. After CHANGE-004 (PRs #22/#23/#24), GET /handoff returns outcome/actor (null before POST /outcome, then e.g. escalate/teller-1), validated against contract/handoff.schema.json; Handoff screen renders them. B gate passed, 38 tests. X-001 resolved. | Driver B (Jonathan); Driver A (Sebastian) |
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

### Hour 2 · Q-004 · SessionState schema vs §11.2 — ACCEPTED (Driver A)
`debug` is constrained to `{recommender, latency_ms, rejections}`. Cross-field rules
stay in `scripts/check_contract.py`. `reference_impl.py` is the source of truth for T2
(the §11.2 example is illustrative). Recorded 2026-10-24.

### Hour 2 · Q-005 · Interview composition — ACCEPTED (Driver A)
Interview = SessionState + `GET /library` + the client's last posted chips/purpose.
Those fields are not added to SessionState in v1. Recorded 2026-10-24.

### Hour 2 · Q-006 · Untyped endpoints — DEFERRED (Driver A)
Handoff, history, health, and POST-enum schemas are a follow-up CHANGE. Session and
Interview work do not wait. Recorded 2026-10-24.

### Hour 2 · Q-007 · library.schema.json is a UI projection — ACCEPTED (Driver A)
`library.schema.json` stays the display subset. The fold uses the backend library, not
this schema. Recorded 2026-10-24.

### Hour 2 · Q-008 · library.json is T1–T7 display copy — ACCEPTED (Driver A)
`contract/library.json` is T1–T7 display copy, not the five §5.3 must-have patterns.
A loads the real library. Recorded 2026-10-24.

### Hour 2 · Q-009 · Events without API surface / missing traces — DEFERRED (Driver A)
`POST /outcome` appends `SessionClosed`; `GET /handoff` appends `ManagerRequested`.
Undo, outcome, and live fixtures wait for A-04: `reference_impl.py` cannot emit those
traces, and the oracle is not edited. Recorded 2026-10-24.

### Hour 2 · Q-010 · B check: fixtures cannot stand alone — ACCEPTED (Driver A)
B loads chip and purpose labels from `GET /library` and keeps posted context chips in
client memory. `stop.reason` stays machine-readable. Recorded 2026-10-24.

### Hour 2 · Q-011 · A check: fold gaps — ACCEPTED (Driver A)
`session_id` is store-assigned. `debug.recommender` is process settings (boot +
`/health`). The model re-issues after undo. Notes and outcome are not projected onto
SessionState in v1. Recorded 2026-10-24.

### Hour 6 · A-03 model pick · Meta-Llama-3.1-8B-Instruct Q4_K_M (Driver A)
Chosen by Driver A (Sebastian) on 2026-10-24 from the A-03 benchmark in
`docs/handoff/000-archive.md`. 8B total p95 482.7 ms vs 3B 296.3 ms; both under the 1.5 s L1b
limit and the ~0.7 s target. 8B uses about 7.4 of 8 GB VRAM on the RTX 5070 Laptop.
Quality is not yet measured. Both models picked `q.homerepair.contractor_name` on
T2. A-05 must compare 8B and 3B on the dev scenarios. The 3B is the fallback if 8B
quality isn't better or VRAM becomes a problem. Recorded 2026-10-24.
Approved: Driver A ☑ (Sebastian) · Driver B ☑ (Jonathan)

### Hour 8 · CP2 · Works end to end with no model
Yes, end to end with `RECOMMENDER=rules`. B-03 (PR #21) walked T1 and T2 against
A's real API on main; every SessionState matched the fixtures except store-assigned
`session_id`. After CHANGE-004 (PRs #22/#23/#24), `GET /handoff` returns
outcome/actor (null before `POST /outcome`, then e.g. escalate/teller-1), validated
against `contract/handoff.schema.json`; Handoff screen renders them. B gate passed,
38 tests. X-001 resolved. Recorded 2026-10-24.
Approved: Driver A ☑ (Sebastian) · Driver B ☑ (Jonathan)
