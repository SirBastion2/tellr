# Contract changes

**CONTRACT_VERSION: 2.0.0** (`contract-v2`; tag on merge)

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

### CHANGE-005 · Explanation, context source, activity feed · applied in 2.0.0
Bundles the three optional, additive B-025 asks into **one** change. WORKFLOW.md
§5 allows at most two changes after hour 4; CHANGE-004 already used one slot, so
this is the remaining change. Both agents rebase once. All three parts are
optional and backward compatible: existing T1–T7 fixtures and golden tests stay
valid (`explanation` absent or null; `source` defaults to `"teller"` when
absent; the new GET is unused by fixtures). Q-013. Applied as `CONTRACT_VERSION`
2.0.0 (`contract-v2`).

**Reason:** B-025's workstation UI can already render level, score, reasons,
pattern, talk track, and debug from today's SessionState + `GET /library` +
`GET /health`. It cannot show per-signal weights, confidence, fallback-for-this-
turn, observed-vs-teller context after reload, or a session-scoped structured
feed. Inventing those in `web/` would break §9 / §12 (no client-side risk
logic). The three fields close that gap without feeding free text to the model
or scorer.

**(a) `explanation` on SessionState and every SessionState response.** Add an
optional object to `contract/session_state.schema.json` (not required; old
fixtures omit it or send null):

```
explanation?: {
  confidence: number | null,
  used_fallback: boolean,
  contributions: [{
    signal_id: string,
    label: string,
    weight: number,
    direction: "raises" | "lowers"
  }]
} | null
```

Exact rules: `weight` values come from the **live** library weights
(`library/signals.yaml` as loaded by the API), not `reference_impl.py` / golden
`reference_weights.yaml`. The rules recommender always returns `confidence:
null`. `used_fallback` is `true` when the model timed out or was rejected for
**that turn**; derive it from the existing `debug` fields (`recommender`,
`latency_ms`, `rejections`) plus the turn's fallback/reject markers already
stored — do not add a new write. Absent or null on old fixtures.

**(b) `source` on `ContextAdded`, echoed on SessionState context chips.** In
`contract/events.md`, `ContextAdded` becomes `ContextAdded(ts, chips, source?)`
with `source: "observed" | "teller"`. When `source` is absent, the fold treats
it as `"teller"`. `POST /sessions/{id}/context` may send the same optional
`source` on the request (one value for that additive batch); omit it and the
event is teller-sourced. SessionState grows an optional `context_chips` array
echoing live chips, each `{ id, source }`, so the copilot strip survives
reload. Absent / empty on old fixtures. Score, reasons, and eligibility ignore
`source` (observed and teller chips assert the same signals).

**(c) Read-only `GET /sessions/{id}/activity`.** Add this row to
`contract/api.md` (architecture §11.1 table stays the source; api.md is the
clarification):

| Method | Path | Request | Response |
|---|---|---|---|
| `GET` | `/sessions/{id}/activity` | — | `{ session_id, rows: [{ ts, channel, amount_band, type }] }` |

Read-only. No new write route. `rows` are derived **only** from that session's
stored events: `amount_band` from `SessionOpened`; `channel` and `type` from
context chips and other stored events. No free text. Unknown session → `404`.
Known session with nothing to project → `200` and `rows: []`. **Not** fed to
the model or the scorer (prompt allowlist and fold stay unchanged).

**Applied.** `CONTRACT_VERSION` is 2.0.0 (`contract-v2`; tag on merge). Fixtures
regenerated with `python scripts/gen_fixtures.py` (T1–T7 byte-identical except
the version field; `reference_impl.py` does not emit the new optional fields).
`scripts/gate.sh contract` and `scripts/gate.sh a` both PASS. A-lane
implementation (API/engine fields, `GET /activity`, tests) follows in a
**separate PR after apply**. Do not edit goldens or `reference_impl.py`.

Status: applied in 2.0.0 (`contract-v2`). Driver A approved 2026-10-24 8:45 PM ET;
Driver B approved B-026 (PR #76, ~8:58 PM ET)

Approved: Driver A ☑ · Driver B ☑ (B-026) · Rejected ☐

### CHANGE-006 · Level score bands on GET /health · applied additively
Optional, additive field on the existing untyped `GET /health` (CHANGE-003 /
Q-006 still deferred; no health schema). Does not bump `CONTRACT_VERSION`.
T1–T7 fixtures, SessionState, goldens, `reference_impl.py`, and
`tests/golden/reference_weights.yaml` stay byte-identical.

**Reason:** Technical details must show the 0–100 Urgency Score cutoffs that
`engine.score.level()` already uses (architecture §6.3: Clear / Caution /
High concern). Hardcoding 25 / 60 in `web/` would invent risk mapping on the
client (§9 / §12). SessionState `additionalProperties: false` and the two
post-hour-4 CHANGE slots are already used; a new required field or fixture
regen is not needed.

**Shape:** `level_bands?: [{ level: "clear"|"caution"|"high", label: string,
min: number, max: number }]`. Inclusive ranges matching `level()`:
High concern if score ≥ `HIGH`, Caution if score ≥ `CAUTION`, else Clear.
`label` is the engine name (`Clear`, `Caution`, `High concern`). `min`/`max`
are derived from `engine.score.CAUTION`, `HIGH`, and the §6.2 +100 clamp.
Absent on older health payloads. Health screen does not render this field.

Approved: Driver A ☑ (task request) · Driver B ☑ (task request) · Rejected ☐

### CHANGE-007 · Suggested-action imperative on talk_track · applied additively
Optional string `talk_track.action`: one short imperative teller move, not a
question. Does not bump `CONTRACT_VERSION`. `question.text`, `talk_track.lines`,
and `talk_track.avoid` stay. Q-016.

**Reason:** The copilot suggested-action card was rendering `question.text`
(the next spoken question). Choosing an imperative in `web/` would pick the
teller's move on the client (architecture §12). The engine already selects
the talk track for the step.

**Shape:** `contract/session_state.schema.json` and `contract/library.schema.json`
add `talk_track.properties.action` as a string. It is not in `required`.
`additionalProperties` stays false. When `action` is absent, the card keeps
its previous content (`question.text`, or the first talk-track line when
there is no question).

**Copy** on each existing row in `library/talk_tracks.yaml`. `copy_status`
stays the compliance-review banner. `lines` are not edited.

| Track | `action` |
|---|---|
| `tt.proceed` (Clear) | Complete the withdrawal. |
| `tt.slow_down` (Caution) | Pause the cash. Verify the story, and offer a cashier's check. |
| `tt.escalate` (High concern) | Ask the customer to step aside and get a manager. |
| `tt.bank_impersonation` | Pause the move and tell them the bank does not move money to keep it safe. |
| `tt.home_repair` | Verify the contractor and the written estimate before releasing cash. |

`engine/rules.py` `talk_track_for` copies the **stage** track's `action` when
that library row has one. Pattern lines still append only while a pattern is
displayed. `avoid` stays the stage list. The projected `action` is the level's
move, not the pattern track's sentence. Pattern-track actions stay on
`GET /library`.

**Fixtures.** `scripts/gen_fixtures.py` carries the same action strings.
Regenerated `contract/library.json` and T1–T7 include `action`. Exact
`talk_track` equality in `tests/golden/test_traces.py` and
`tests/api/test_contract.py` cannot hold if the fold emits the key and the
fixtures omit it. The optional-field addition is on the regenerated fixtures.
`lines`, `avoid`, scores, question text, weights, and `reference_impl.py` are
unchanged. `reference_impl.py` does not carry talk-track prose. No
weights-frozen edit.

Approved: Driver A ☑ Sebastian, 2026-10-25 · Driver B ☑ (B consent relayed by Sebastian) · Rejected ☐

### Approval of contract-v1
Driver A ☑ · Driver B ☑
