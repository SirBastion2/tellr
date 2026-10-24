# Handoff log

Append-only, newest at the bottom. One entry per card, or per stop.

## Template

### [CARD] Title — Agent X — YYYY-MM-DD HH:MM
- **Status:** done | partial | blocked
- **Gate:** `scripts/gate.sh x` → PASS or FAIL (paste the last few lines)
- **Changed:** paths
- **Decisions I made, and the section that justified each:**
- **Questions logged:** Q-nnn
- **The next agent needs to know:**

---

### [P0] Contract freeze (steps 1–4 only) — Agent R — 2026-10-24 19:15
- **Status:** partial (steps 1–4 done; 5–7 not started)
- **Gate:** `python3 scripts/check_contract.py` → PASS (`contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact`). `scripts/gate.sh contract` not run (out of scope for 1–4).
- **Changed:** `docs/QUESTIONS.md` (appended Q-002/Q-003 driver notes and Q-004–Q-011); `docs/HANDOFF.md` (this entry)
- **Decisions I made, and the section that justified each:** none. Card + user: do not decide CHANGE-001/002, do not edit `contract/`, do not tick approvals, do not tag, do not merge, do not touch `reference_impl.py` or goldens.
- **Questions logged:** Q-004, Q-005, Q-006, Q-007, Q-008, Q-009, Q-010 (B check), Q-011 (A check); plus CHANGE-001/002 pros/cons under Q-002/Q-003
- **The next agent needs to know:** Shipped contract checker is green. Drivers still own CHANGE-001 (settings) and CHANGE-002 (error shape); R logged neutral pros/cons only. Top issues: SessionState cannot render the Interview without `/library` plus client memory (no chip labels, no selected context chips, no purposes); `library.schema.json` is a display subset and cannot feed the §4 fold; sample `library.json` has 2 of 5 §5.3 patterns; handoff/history/health and `amount_band` are untyped; fixtures never hit undo, outcome, or live. After drivers record CHANGE-001/002 in `docs/DECISIONS.md`, resume P0 at step 5.

---

### [P0] Contract freeze (steps 5–6) — Agent R — 2026-10-24 19:20
- **Status:** partial (steps 5–6 done; step 7 / `contract-v1` tag / both-driver approval not done)
- **Gate:** `scripts/gate.sh contract` → PASS (`contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact`)
- **Changed:** `docs/DECISIONS.md`; `docs/QUESTIONS.md`; `docs/HANDOFF.md`; `contract/CHANGES.md`; `contract/api.md`; `contract/error.schema.json` (new)
- **Decisions I made, and the section that justified each:** none beyond recording Driver A's. CHANGE-001 rejected (§11.1 has no write path; settings = boot flag + `GET /health`). CHANGE-002 accepted with an exhaustive `code` enum from the §4 command-handler invariants; 409 vs 422 as specified. No other contract gap was obvious enough to apply.
- **Questions logged:** Q-002/Q-003 answered; Q-004–Q-011 recommended and marked `deferred: pending drivers`. Applied Q items: none.
- **The next agent needs to know:** Driver B still needs to tick CHANGE-001/002 and contract-v1. Do not tag `contract-v1` until both boxes are ticked. Error body lives in `contract/error.schema.json`. B-06 Settings is read-only `/health`. Q-004–Q-011 are still open judgment calls (SessionState extras, untyped handoff/history/health, display-only library, fixture coverage).

---

### [P0] Q-004–Q-011 clarifications (CHANGE-003) — Agent R — 2026-10-24 19:30
- **Status:** done (Driver A recommendations applied; Driver B / `contract-v1` still open)
- **Gate:** `scripts/gate.sh contract` → PASS (`contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact`)
- **Changed:** `contract/CHANGES.md`, `contract/api.md`, `contract/events.md`, `contract/session_state.schema.json`, `contract/library.schema.json`, `contract/oracle.sha256`, `docs/QUESTIONS.md`, `docs/DECISIONS.md`, `docs/HANDOFF.md`, `scripts/gen_fixtures.py` (Q-008 docstring). Fixtures regenerated identically.
- **Decisions I made, and the section that justified each:** none beyond recording Driver A's accepted recommendations. Q-006 deferred to a follow-up CHANGE; Q-009 event-append rules recorded, fixtures deferred to A-04 because `reference_impl.py` cannot emit undo/outcome/live traces.
- **Questions logged:** Q-004, Q-005, Q-007, Q-008, Q-010, Q-011 answered; Q-006 deferred: follow-up CHANGE; Q-009 deferred: A-04.
- **The next agent needs to know:** Interview = SessionState + `GET /library` + client-posted chips/purpose. `debug` is `{recommender, latency_ms, rejections}`. Library contract files are UI / T1–T7 display copy. Do not tag `contract-v1` or tick Driver B. Do not edit `reference_impl.py`.

---

### [A-01] Library + engine-api-v1 — Agent A1 — 2026-10-24 19:26
- **Status:** done (A1 half). Gate `a` blocked on A2 files, not on this diff.
- **Gate:** `scripts/gate.sh a` → FAIL at `.importlinter missing (card A-01 creates it).` Ruff on `engine/` `tests/engine/` `tests/library/` PASS. `pytest -q tests/library tests/engine` → 20 passed. Contract oracles untouched.
- **Changed:** `engine/__init__.py`, `engine/library.py`, `engine/testing.py`, `library/*.yaml`, `tests/library/**`, `tests/engine/**`, `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - Ported the six-question bank and weights from `reference_impl.py` / §5 / §6.2, with teller copy from `contract/library.json` (A-01 step 2).
  - Included all five §5.3 patterns so purpose IDs resolve. The three unspecified patterns (`pat.government_impersonation`, `pat.family_emergency`, `pat.tech_support`) are stubs with empty signals and `review: compliance` (A-01; draft §7.3). No invented weights.
  - Added `export_library()` (not in the ROSTER signature list) so A2 can serve `GET /library` as the Q-007 UI projection. Schema-valid; a superset of `contract/library.json` (five patterns, not two).
  - Module-level `project` / `candidates` / `stop` / `rule_choice` / `check_command` raise `NotImplementedError`. A2 must import `FakeEngine` until A-02/A-04 land (ROSTER §5.1).
  - `FakeEngine.project` matches `SessionOpened` / `ContextAdded` / `AnswerRecorded` prefixes onto fixture request traces (chip order ignored). Shared prefixes T1/T3/T6 and T4/T7 return identical states except `session_id`.
- **Questions logged:** none
- **The next agent needs to know:**
  - **Interface name: `engine-api-v1`.** Frozen in `engine/__init__.py`: `load_library(path) -> Library`, `project(events, lib) -> SessionState`, `candidates(state, lib) -> (Stage, list[QuestionId])`, `stop(state, lib, cands) -> Stop | None`, `rule_choice(cands) -> QuestionId`, `check_command(events, command, lib) -> None` (raises `CommandRejected(code)`). Tag `engine-api-v1` on main after merge; A1 did not push the tag.
  - **A2:** `from engine.testing import FakeEngine`. Same method names as the module. `replay("T1", 0)` for an explicit step. `check_command` already maps CHANGE-002 codes `scenario_on_live_session`, `purpose_required_on_opener`, `purpose_not_allowed`, `session_closed`, `outcome_requires_actor`, `close_without_outcome`.
  - **`GET /library`:** `export_library(load_library("library"))`. Keys: `library_version` (`1.2.0`), `copy_status` (draft §7.3 banner), `chips`, `purposes` (all eight), `context_chips`, `questions` (six), `signals`, `patterns` (five), `look_alikes` (five), `talk_tracks`. Validates against `contract/library.schema.json`. Weights / `asserts_on` / routing are not in the export.
  - **A2 dependency request (please add to `pyproject.toml`):** `pydantic>=2`, `pyyaml`, `pytest`, `ruff`, `import-linter`. Pytest needs `pythonpath = ["."]` — `tests/engine/` shadows the `engine` package without it. `.importlinter` must ban `engine` → `api` / `store` / `recommenders`.
  - **A3:** question intents are `purpose`, `counterparty_identity`, `written_estimate`, `receiving_account`, `secrecy`, `payment_flexibility`. Do not read `library/signals.yaml` if you are Driver B.

---

### [A-01] Skeleton and store — Agent A2 — 2026-10-24 19:26
- **Status:** partial (implementation done; gate blocked on A1 `engine/`)
- **Gate:** `scripts/gate.sh a` → FAIL at import-linter (`Could not find package 'engine' in your Python path.`). ruff PASS. pytest 10 passed (`tests/store/` §10.1). Did not create `engine/` (A1 owns it).
- **Changed:** `pyproject.toml`, `Makefile`, `.importlinter`, `tests/conftest.py`, `store/sqlite.py`, `store/__init__.py`, `tests/store/test_sqlite.py`, `scripts/with-gpu`, `api/main.py`, `api/__init__.py`, `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - §10.1 SQL and triggers copied verbatim; `connect()` sets `PRAGMA foreign_keys = ON` on every connection (tc-12, A-01).
  - `purge(conn, retention_days, *, now=None)` deletes events then sessions in one transaction. `now` is a test seam so retention is deterministic (architecture §10.1).
  - `make dev-api` starts uvicorn in tmux session `teller-api` on 127.0.0.1:8000 (WORKFLOW §2.4, architecture §15). Placeholder `GET /health` only.
  - `scripts/with-gpu` is exactly `exec flock /tmp/tc-gpu.lock "$@"` (ROSTER §5.3).
  - `.importlinter` forbids `engine` → `api` / `store` / `recommenders`. `recommenders` is not a root package yet (no package on this branch).
  - Dependencies are only those listed on the card (fastapi, uvicorn, pydantic v2, pyyaml, pytest, ruff, import-linter). setuptools is the build backend.
- **Questions logged:** none
- **The next agent needs to know:**
  - Store API: `connect(path)`, `initialize(conn)`, `purge(conn, retention_days, *, now=None)`, `SCHEMA_SQL`.
  - Persist `closed_at` as ISO-8601 `YYYY-MM-DDTHH:MM:SS` so text comparison with the purge cutoff works.
  - `/library` is A1. This placeholder app does not export it.
  - `scripts/gate.sh a` cannot pass on an A2-only tree: import-linter requires the `engine` package. After A1 lands `engine/`, rebase and re-run the gate. Do not create `engine/` from A2.
  - GPU jobs: `scripts/with-gpu <cmd>`.
  - `pip install -e .`; `ruff` and `lint-imports` need to be on PATH.

---

### [A-01] Merge A1 + gate a — Agent A2 — 2026-10-24 19:35
- **Status:** done (A2 half; `scripts/gate.sh a` PASS after merging `origin/main`)
- **Gate:** `scripts/gate.sh a` → PASS

```
── ruff
All checks passed!

── pytest
30 passed in 0.30s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** `docs/HANDOFF.md` (merge kept both A-01 sections; this entry); `.importlinter` (`include_external_packages = True` so `recommenders` can be named before that package exists)
- **Decisions I made, and the section that justified each:**
  - Merged `origin/main` (A1 PR #9) rather than rebasing. HANDOFF conflict resolved by keeping both A1 and A2 sections (append-only).
  - `pyproject.toml` already had `pydantic>=2`, `pyyaml`, `pytest`, `ruff`, `import-linter`, and `pythonpath = ["."]` (A1 request; `tests/engine` shadows `engine` without it). No further dep change.
  - Import-linter failed because `recommenders` is listed in the A-01 contract but is not a root package yet. Set `include_external_packages = True` instead of creating `recommenders/` (card A-01; ROSTER §3). Did not touch `engine/`, `library/`, `eval/`, `reference_impl.py`, `contract/`, or goldens.
- **Questions logged:** none
- **The next agent needs to know:**
  - Gate a is green on this branch. A2 half of A-01 is done.
  - Use `from engine.testing import FakeEngine` until A-02/A-04 land. `GET /library` is `export_library(load_library("library"))` (A1 HANDOFF).
  - `recommenders` is still absent; import-linter treats it as external. Add it to `root_packages` when the package is created.
  - `pip install -e .`; put `~/.local/bin` on PATH so `ruff`, `pytest`, and `lint-imports` resolve.

---


### [A2 hours 4–6] API on FakeEngine — Agent A2 — 2026-10-24 19:34
- **Status:** done (hours 4–6). Stopped before A-03.
- **Gate:** `scripts/gate.sh a` → PASS

```
── ruff
All checks passed!

── pytest
47 passed in 1.25s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** `api/main.py`, `api/errors.py`, `store/sqlite.py`, `tests/api/**`, `pyproject.toml` (`httpx` for FastAPI `TestClient`), `api/.gitignore`, `tests/api/.gitignore`
- **Decisions I made, and the section that justified each:**
  - API is thin: `FakeEngine.check_command` then append then `FakeEngine.project`; `session_id` stamped from the store (CHANGE-003 / Q-011). Risk, question, and stop come from the engine, not `web/` or ad-hoc API math (§4, §11).
  - CHANGE-002: `CommandRejected` → `409 {"error":{"code","message"}}`. `actor` and `purpose` are optional on the request models so a missing opener purpose / missing outcome actor is 409, not 422. Malformed bodies stay FastAPI 422.
  - `GET /library` is `export_library` of the booted library (A1 HANDOFF; Q-007).
  - `POST /outcome` appends `OutcomeRecorded` then `SessionClosed` (CHANGE-003 / Q-009). `GET /handoff` appends `ManagerRequested` and returns an untyped summary (Q-006).
  - `GET /sessions` excludes practice by default; `?mode=practice|all` is a temporary filter until Q-006 schemas land.
  - `RECOMMENDER` boot flag, default `rules`. `GET /health` is the read-only view (CHANGE-001 rejected).
  - SQLite `connect(..., check_same_thread=False)` so FastAPI's worker thread can use the connection (A-01 store + FastAPI).
- **Questions logged:** none. Q-006 (handoff/history/health schemas) and Q-009 (no close endpoint; undo/outcome fixtures wait for A-04) still cover the gaps.
- **The next agent needs to know:**
  - **Hours 4–6 are done. Do not start A-03 until drivers ask.** Contract conformance is already green against `FakeEngine` (42 fixture steps).
  - Import: `from engine.testing import FakeEngine`. Do not call `engine.project` / `engine.check_command` until A-04; those still raise `NotImplementedError`.
  - `close_without_outcome` has no HTTP path (outcome always closes). Mapping is tested via `api.errors.rejected_response`.
  - Undo appends `Truncated`; FakeEngine ignores it, so the returned state does not pop until the real fold lands.
  - Live traces that match a practice fixture prefix replay after rewriting `SessionOpened.mode` to `practice` (comment in `api/main.py`). Remove that adapter in A-04.
  - `make dev-api` still starts uvicorn on `127.0.0.1:8000`. Default DB is `/tmp/teller-copilot.sqlite` (`TELLER_DB` overrides).
  - New dep: `httpx` — required by FastAPI `TestClient`. No other new dependency.

---

### [A-02] Reducer, scorer, ranker — Agent A1 — 2026-10-24 19:45
- **Status:** done
- **Gate:** `scripts/gate.sh a` → PASS

```
── ruff
All checks passed!

── pytest
43 passed in 8.98s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

Property test (65,536 evidence sets) ran inside that 8.98s suite; well under 60s.
- **Changed:** `engine/events.py`, `engine/score.py`, `engine/hypotheses.py`, `engine/reduce.py`, `engine/__init__.py` (wires `project` only; signatures unchanged), `tests/engine/test_properties.py`, `tests/engine/test_undo.py`, `tests/engine/test_fold_total.py`, `tests/engine/test_interface.py`, `tests/golden/test_scores.py`, `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - Ported `effective`, `score`, `level`, `shown`, `reasons`, `pattern_scores`, `displayed` with the same names as `reference_impl.py` (A-02; tc-11). They take a `Tables` argument so goldens can load `tests/golden/reference_weights.yaml` and never `library/signals.yaml`.
  - `engine.project` is the A-01 `engine-api-v1` function, implemented in `engine/reduce.py`. Parameter names stay `events`, `lib`. A-04 entrypoints still raise `NotImplementedError`.
  - The fold assigns `seq` by log order (`contract/events.md`). `Truncated(to_seq)` pops live events with `seq > to_seq` and keeps folding (§4). Unknown kinds are logged at WARNING and skipped.
  - `question` / `stop` / talk-track lines are not computed here (A-04). Risk fields, `stated_purpose`, `answers`, and `suggested_outcome` (follows shown level, §11.2) are.
  - Q-008 stubs `pat.government_impersonation`, `pat.tech_support`, `pat.family_emergency` (and their look-alikes) were already in `library/patterns.yaml` from A-01, marked `review: compliance`, empty signals, no invented weights. Left untouched.
- **Questions logged:** none
- **The next agent needs to know:**
  - **Oracle surprises (where bugs hide):**
    - The context row's shown level equals raw. Hysteresis starts from Clear, so T1's first context (26) is already Caution. The hold shows up at T1/T3/T6 Q1: raw Clear, shown Caution (`shown` uses the previous *shown*, not raw).
    - `asserts_on` is exclusive: chip defaults (`changed` → `sig.story_drift`, `relayed_by_caller` → `sig.answer_relayed`, open `vague`/`no_answer` → `sig.specificity_gap`) apply only when that chip is omitted from `asserts_on`.
    - `reasons()` is same-direction IDs only. The opposite item is `counterpoint`, not a fourth reason. Ordering is raw `|weight|`, then ID; family caps do not reorder.
    - T6's cashier's-check `denied` refutes `look.contractor_with_estimate`, so the rehearsed name and estimate drop out of `effective` and the score jumps from −14 to 29. Displayed pattern goes back to "Pattern unclear" (home repair and bank impersonation tie at 26; lead < 8).
    - `displayed()` talks in IDs (`Looks like: pat.bank_impersonation`). `project` maps those to library labels for `risk.pattern` / `pattern_label`.
    - Stub patterns with empty `signals` do not move T1–T7 scores or labels. Stated purpose is stored and never scored (tested).
    - Display snap-to-raw at a stop is A-04. None of T1–T7's stop rows have shown ≠ raw, so goldens do not need it yet.
  - **A2:** keep `FakeEngine` until A-04 fills `question` and `stop`. `engine.project` now returns real risk fields; `question` is always `null` and `stop` is always `null` on this card. Do not treat that as CHANGE-000.
  - **A4 / A1 next:** eligibility, stop rule (including CHANGE-000 and the snap), and talk tracks. Do not retouch weights.
  - Goldens overlay `tests/golden/reference_weights.yaml` onto a loaded library so A-07 tuning cannot move them.

---

### [A-02] Merge origin/main (#11 API) — Agent A1 — 2026-10-24 19:50
- **Status:** done
- **Gate:** `scripts/gate.sh a` → PASS

```
── ruff
All checks passed!

── pytest
60 passed, 1 warning in 9.48s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** `docs/HANDOFF.md` (merge kept both the A2 hours 4–6 section and the A1 A-02 section; this entry)
- **Decisions I made, and the section that justified each:**
  - Merged `origin/main` (A2 PR #11) rather than rebasing. The only conflict was `docs/HANDOFF.md`; resolved by keeping every section (append-only).
  - Incoming A2 files (`api/`, `store/`, `tests/api/`, `pyproject.toml`) merged cleanly. Did not edit A2 paths, `reference_impl.py`, `contract/`, or `tests/golden/reference_weights.yaml`.
- **Questions logged:** none
- **The next agent needs to know:**
  - Gate a is green on this branch after the merge (60 tests: A1 engine/library/golden + A2 api/store).
  - API still uses `FakeEngine` until A-04. `engine.project` is real on this branch; `question` and `stop` stay null.
  - One Starlette warning: `httpx` with `starlette.testclient` is deprecated; A2 owns that path.

---

### [A-04] Eligibility, stop, rules, golden traces — Agent A1 — 2026-10-24 19:45
- **Status:** done (A1 engine half). A2 still swaps the real engine for CP2.
- **Gate:** `scripts/gate.sh a` → PASS

```
── ruff
All checks passed!

── pytest
74 passed, 1 warning in 9.83s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** `engine/eligibility.py`, `engine/stop.py`, `engine/rules.py`, `engine/reduce.py`, `engine/__init__.py`, `tests/golden/test_traces.py`, `tests/engine/test_commands.py`, `tests/engine/test_interface.py`, `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - Ported `eligible`, `stop_check`, `signals_for` with the oracle names (A-04; tc-11). `RuleEngine.run_case` matches `reference_impl.run_case` row-for-row, including the pre-CHANGE-000 stop tuple.
  - `engine.stop` / `project` apply CHANGE-000: when a recommended stop and empty candidates coincide, hard wins `kind` and `reason` names both; `question` is null (§8.4, §11.2, T1/T5 last steps).
  - Display snaps to raw at any stop (§8.4 / oracle `run_case`). Talk tracks take stage lines from the shown-level outcome and add pattern lines only while a pattern is displayed (§7.1; `gen_fixtures.py`).
  - `check_command` raises `CommandRejected` with the six CHANGE-002 codes. Command `type` accepts both the A2 HTTP verbs (`answer`/`outcome`/`close`) and the event names.
  - `project` attaches an `_engine` bag (`asked`, `evidence`, `purpose`, `story_failed`, `context`) so `candidates(state, lib)` and `stop(state, lib, cands)` stay on the frozen signatures. `engine.public_state` strips it. Did not add those fields to the SessionState schema.
  - Did not edit weights, goldens, `reference_impl.py`, `contract/`, `api/`, or `store/`.
- **Questions logged:** none
- **The next agent needs to know:**
  - **A2 (swap):** `from engine import project, candidates, stop, rule_choice, check_command, public_state`. Replace `FakeEngine` with these. `RECOMMENDER=rules` can use `project` as the complete rules-path fold (question / stop / talk_track filled). Before HTTP, `public_state(state)` — `_engine` is not in `session_state.schema.json`. Drop the live-mode rewrite adapter in `api/main.py`.
  - **T1 last step:** `stop.kind=hard`, `reason=enough to proceed; nothing left to ask`, `question=null` (CHANGE-000). T2 last step keeps `q.alternative.cashiers_check` under a recommended escalate stop.
  - **Goldens** still load `tests/golden/reference_weights.yaml`, never `library/signals.yaml`.
  - Checkpoint CP2 is A2's: hour-8 integration against the real API. A1 is stopped here.

### [A-04] API swap to the real engine — Agent A2 — 2026-10-24 19:52
- **Status:** done (A2 API half). **Checkpoint CP2:** stop until the drivers confirm the hour-8 integration run.
- **Gate:** `scripts/gate.sh a` → PASS

```
── ruff
All checks passed!

── pytest
83 passed, 1 warning in 10.20s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** `api/main.py`, `tests/api/test_q009.py`, `tests/api/conftest.py`, `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - Replaced `FakeEngine` with `from engine import project, candidates, stop, rule_choice, check_command, public_state` (A1 A-04 HANDOFF; ROSTER §5.1). `RECOMMENDER=rules` uses `project` as the complete rules-path fold; the other helpers stay on the call path so the API is not on the stand-in.
  - `public_state(state)` before HTTP. `_engine` is not in `session_state.schema.json` (A1 HANDOFF; CHANGE-003 / Q-011).
  - Dropped the live-mode FakeEngine rewrite in `api/main.py`. Live sessions fold natively (§11.1; Q-009).
  - `Truncated.to_seq` is the fold's 0-based log order (`engine.reduce._live_events` / `contract/events.md`), not the store's 1-based PK. Undo walks live events so a second undo pops again (§4).
  - Outcome still appends `OutcomeRecorded` then `SessionClosed` (CHANGE-003 / Q-009). Notes/outcome/actor/closed stay off SessionState (Q-011).
  - CHANGE-002 mapping is unchanged: `CommandRejected` → `409 {"error":{"code","message"}}`.
- **Questions logged:** none. Q-009 coverage is now API tests (`tests/api/test_q009.py`), not contract fixtures (`reference_impl.py` still cannot emit undo/outcome/live).
- **Cross-lane:** none. No `docs/CROSS_LANE.md` entry.
- **The next agent needs to know:**
  - **CP2:** this PR does not merge. Drivers walk T1/T2 on B's screen against this API. A2 is stopped here.
  - T1–T7 contract replay is green against the real engine. Q-009: undo pops, two undos pop twice, answer-after-undo is live, outcome closes, live T2 matches the fixture except `mode`.
  - `make dev-api` still starts uvicorn in tmux on `127.0.0.1:8000`. Default DB `/tmp/teller-copilot.sqlite` (`TELLER_DB` overrides).
  - No new dependency.
  - **T2 curl walkthrough** (scores 0 → 32 → 40 → 58 → 80; last step recommended escalate, question `q.alternative.cashiers_check`, `_engine` absent):

```
TELLER_DB=/tmp/teller-t2.sqlite python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8010

curl -sS http://127.0.0.1:8010/health
# {"recommender":"rules","model_id":null,"last_p95":null,"fallback_rate":0.0,"agreement_rate":null}

SID=$(curl -sS -X POST http://127.0.0.1:8010/sessions \
  -H 'Content-Type: application/json' \
  -d '{"mode":"practice","amount_band":"5000_9999"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['session_id'])")
# open: answers=0 score=0 question=q.purpose.open

curl -sS -X POST http://127.0.0.1:8010/sessions/$SID/context \
  -H 'Content-Type: application/json' \
  -d '{"chips":["chip.on_phone","chip.cash_only","chip.rushed"]}'
# context: answers=0 level=caution score=32

curl -sS -X POST http://127.0.0.1:8010/sessions/$SID/answers \
  -H 'Content-Type: application/json' \
  -d '{"question_id":"q.purpose.open","chip":"relayed_by_caller","purpose":"purpose.moving_money"}'
# Q1: answers=1 purpose.moving_money score=40 question=q.recipient.account_details

curl -sS -X POST http://127.0.0.1:8010/sessions/$SID/answers \
  -H 'Content-Type: application/json' \
  -d '{"question_id":"q.recipient.account_details","chip":"vague"}'
# Q2: answers=2 score=58 question=q.secrecy.told_not_to_tell

curl -sS -X POST http://127.0.0.1:8010/sessions/$SID/answers \
  -H 'Content-Type: application/json' \
  -d '{"question_id":"q.secrecy.told_not_to_tell","chip":"confirmed"}'
# Q3: answers=3 score=80 level=high stop={kind:recommended, reason:enough to escalate}
# question=q.alternative.cashiers_check suggested_outcome=escalate
```



### [A-03] Latency benchmark — Agent A (run on Jonathan's laptop) — 2026-10-24 15:55
- **Status:** done
- **Gate:** not run (card's done-when is numbers in HANDOFF; no gate step named)
- **Changed:** `scripts/bench_llm.py` (new), `docs/HANDOFF.md` (this entry)
- **Setup:** NVIDIA GeForce RTX 5070 Laptop GPU, 8151 MiB VRAM, driver 592.01, Windows; llama.cpp b11865 win CUDA 13.4; `llama-server -ngl 99 -c 4096 -np 1`; bartowski GGUFs. Prompt: 947-token stable prefix + 348-token suffix (T2 transcript, context chips, evidence, leading pattern, 12 candidates); 12-way GBNF over question IDs; temperature 0; `cache_prompt`; 3 warm-up runs, then 50 timed. Total = client wall clock per request; prefill/decode = llama-server `timings`.
- **Results (ms):**

| Model | Total p50 | Total p95 | Prefill p50 | Prefill p95 | Decode p50 | Decode p95 | VRAM used | L1b ≤1.5 s | §8.3 ≈0.7 s |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| Llama-3.2-3B-Instruct Q4_K_M | 273.2 | 296.3 | 86.6 | 92.2 | 174.4 | 184.0 | 4865 MiB | PASS | PASS |
| Meta-Llama-3.1-8B-Instruct Q4_K_M | 463.6 | 482.7 | 166.4 | 171.7 | 285.2 | 291.9 | 7379 MiB | PASS | PASS |

- **Decisions I made, and the section that justified each:** §8.1 names no model family, so Llama-3.2-3B / Llama-3.1-8B per the card. The library has 6 questions, so the 12-way grammar (§8.3) is the 5 non-opener library IDs plus 7 synthetic `q.bench.extra_NN` IDs. Suffix came out ~350 tokens, above the ~250 target, which is the conservative direction for prefill. Each run varies the suffix so prefill really processes the new tokens (~346) against the cached prefix.
- **Questions logged:** none
- **The next agent needs to know:** Both models fit L1b and the target with wide margin; decode (~15 tokens) dominates. 8B Q4_K_M at ctx 4096 uses ~7.4 of 8 GB, tight for anything else on the GPU. Both models picked `q.homerepair.contractor_name` for T2 (a bank-impersonation case) — a quality signal only, not measured here. Model choice is for the drivers (DECISIONS.md); A-05 not started.

---

### [CHANGE-004] Handoff projection schema — Agent A — 2026-10-24 20:13
- **Status:** done (proposal only; not applied)
- **Gate:** `scripts/gate.sh contract` → PASS

```
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (contract)
```

- **Changed:** `contract/CHANGES.md`, `contract/api.md`, `contract/handoff.schema.json` (new), `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - Proposed (did not apply) CHANGE-004: type `GET /sessions/{id}/handoff` as today's manager summary plus `outcome` and `actor`, both null until `POST /outcome` (WORKFLOW.md §5; CHANGE-003 / Q-006 deferred; Q-005 / Q-010 / Q-011 keep those fields off SessionState).
  - Did not edit `api/`, `web/`, `reference_impl.py`, `tests/golden/`, or `contract/fixtures/`. History, health, and POST-enum schemas stay deferred.
- **Questions logged:** none. Resolves the handoff part of Q-006 only, pending both drivers.
- **The next agent needs to know:** PR is Proposed. Both driver boxes are unticked. After both drivers approve, R applies on main (bump `CONTRACT_VERSION`, tag). Then A2 adds `outcome`/`actor` to `api/main.py` `handoff()` from the latest `OutcomeRecorded` and validates with `tests/api` against `handoff.schema.json`. Do not project them onto SessionState. Do not merge this PR as applied.
