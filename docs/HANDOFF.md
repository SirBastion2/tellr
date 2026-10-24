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

### [A-06] Evaluation hours 2–6 (validate + 15 scenarios) — Agent A3 — 2026-10-24 19:25
- **Status:** partial (hours 2–6 slice done; hours 6–8 still own the last 15 scenarios and the solo `PREREGISTRATION.md` commit)
- **Gate:** `scripts/gate.sh a` → FAIL at `.importlinter missing (card A-01 creates it).` Ruff and pytest on `eval/` + `tests/eval/` pass (`21 passed`). Did not add `.importlinter` or `pyproject.toml` (A2).
- **Changed:** `eval/validate.py`; `eval/__init__.py`; `eval/PREREGISTRATION.md` (draft, no run); `eval/scenarios/dev/` (15 YAML); `tests/eval/`; `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - Scenario IDs and answers for T1–T7 copied from `reference_impl.py` CASES / §6.4; extras from public FTC/FBI/AARP imposter guidance and the §13.1 / §18.16 cover-story shapes.
  - `pattern_truth` is `pat.*` for coached and `null` for legitimate. Validator does **not** require those ids in `contract/library.json` patterns (Q-008: that file is T1–T7 display copy; A1 loads the real library). Two scenarios use `pat.government_impersonation` and `pat.tech_support`.
  - Cover story = stated purpose’s usual pattern ≠ `pattern_truth` (T3, §13.1). `purpose.vehicle` / `purpose.gift_or_travel` have no pattern, so any `pat.*` truth counts as a cover.
  - Arm A draft prior threshold is 3 concerning items; the sheet is binary (High at/above, Clear below, no Caution column). §13.2 is a yes-count threshold; mapping the flag to Caution only would recreate the §18.2 game. Official freeze is a solo commit at hours 6–8.
  - `tags` / `source` are eval bookkeeping, not engine inputs. No age, appearance, or name fields.
- **Questions logged:** none (Q-008 already covers the two extra pattern ids)
- **The next agent needs to know:**
  - **A2:** please add `pytest`, `ruff`, and `pyyaml` to `pyproject.toml` when it lands. A3 ran them from a user install. Also `.importlinter` (A-01) is what blocks `scripts/gate.sh a`.
  - **Hours 6–8 (A3):** add 7 coached + 8 legitimate to reach 15/15. The first 15 already meet the §5.2 minima (8 coached / 7 legitimate; 4 covers; 3 perfectly coached; 4 innocent red-flag; 3 vague-but-genuine). Then **commit `eval/PREREGISTRATION.md` alone** before any run.
  - **A1:** real library should include `pat.government_impersonation` and `pat.tech_support` (and `pat.family_emergency`) so later arms can label those truths.
  - Do not write `eval/scenarios/heldout/`. Do not commit this draft with results. Driver A reviews `eval/` PRs.

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

### [A-06] Merge main + gate a — Agent A3 — 2026-10-24 19:45
- **Status:** partial (hours 2–6 still; hours 6–8 still own the last 15 scenarios and the solo `PREREGISTRATION.md` commit)
- **Gate:** `scripts/gate.sh a` → PASS

```
── ruff
All checks passed!

── pytest
51 passed in 0.49s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** `docs/HANDOFF.md` only (merge kept A-06 + all three A-01 sections; this entry). No edits in `eval/` or `tests/eval`.
- **Decisions I made, and the section that justified each:**
  - Merged `origin/main` (A1 #9, A2 #10) rather than rebasing. HANDOFF conflict resolved by keeping every existing section (append-only).
  - Gate was green after the merge; no `eval/` or `tests/eval` fixes. Did not add scenarios, did not run the eval, did not touch `eval/heldout`, `contract/`, `reference_impl.py`, or goldens.
- **Questions logged:** none
- **The next agent needs to know:**
  - Gate a is green on this branch (PR #8). Hours 6–8 still add 7 coached + 8 legitimate, then commit `eval/PREREGISTRATION.md` alone before any run.
  - A1 already landed `pat.government_impersonation`, `pat.tech_support`, and `pat.family_emergency` (stubs). A2 landed `pyproject.toml` / `.importlinter`.
  - Do not write `eval/scenarios/heldout/`. Driver A reviews `eval/` PRs.

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

### [CHANGE-004] Handoff outcome/actor on GET /handoff — Agent A2 — 2026-10-24 20:18
- **Status:** done
- **Gate:** `scripts/gate.sh a` → PASS

```
── ruff
All checks passed!

── pytest
85 passed, 1 warning in 10.50s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** `api/main.py` (`handoff()` only), `tests/api/conftest.py`, `tests/api/test_q009.py`, `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - `handoff()` reads the latest `OutcomeRecorded` from `store.load_events` and adds `outcome` and `actor` (`None` until recorded) (CHANGE-004; Q-005 / Q-010 / Q-011 keep those fields off SessionState).
  - Did not add them to `render()` / SessionState, did not change `POST /outcome`, did not return notes.
  - Did not edit `web/`, `contract/`, `reference_impl.py`, `tests/golden/`, or fixtures.
- **Questions logged:** none
- **The next agent needs to know:**
  - `GET /sessions/{id}/handoff` now validates against `contract/handoff.schema.json` via `assert_handoff()`. Before `POST /outcome`, `outcome` and `actor` are null and `ManagerRequested` is appended. After outcome they equal the posted values. SessionState still omits `outcome` / `actor` / `closed`.
  - B1 can render the recorded outcome and actor from the handoff projection. Do not merge this PR unless a driver says so.
  - No new dependency.

---

### [B-01] Scaffold, mock server, shells — Agent B1 — 2026-10-24 19:30
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS
  ```
  Test Files  8 passed (8)
       Tests  21 passed (21)
  ── contract
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (b)
  ```
- **Changed:** `web/**` (Vite + React + TypeScript strict + Tailwind + vitest + eslint; types; ajv banner; `web/mock` fixture replay; eight routes). Appended `docs/HANDOFF.md`, `docs/QUESTIONS.md`.
- **Decisions I made, and the section that justified each:**
  - Eight UI routes are `/`, `/sessions/:id/context`, `/sessions/:id`, `/sessions/:id/outcome`, `/sessions/:id/handoff`, `/sessions`, `/health`, `/settings`. §12 says eight routes and does not name them (Q-012).
  - Interview and Context render `SessionState` plus labels from `GET /library`. Posted context chip ids stay in client memory (CHANGE-003 / Q-005, Q-010). `stop.reason` is shown raw; the §12 teller sentence is not substituted.
  - The mock replays `contract/fixtures/T*.json` in order. A different body still returns the next fixture `SessionState` and warns. It does not score the posted chips. `POST /sessions?case=` rejects `scenario_id` when `mode` is `live` with `409` `scenario_on_live_session` (CHANGE-002). No live `SessionState` is synthesized; fixtures are practice (Q-009 deferred to A-04).
  - Settings does not call `/settings` (CHANGE-001). Handoff, history, and health shells do not call those endpoints and do not invent bodies (Q-006 deferred).
  - Unparseable JSON on the dev middleware returns `422` with body `null`. The UI does not invent a FastAPI `detail` array; that body is not in the contract.
  - Screenshot of the Interview shell at T2's second answer was skipped (driver instruction). `web/src/interview.test.tsx` asserts that step's level, score, pattern label, question text, reasons, and library purpose label.
- **Questions logged:** Q-012
- **The next agent needs to know:** Branch is rebased on `contract-v1` (`5515060`). `VITE_API_URL` is the API base; empty uses the Vite origin, where the mock middleware serves `/library` and `/sessions`. Run `npm run dev` from `web/` (127.0.0.1:5173). A2 owns the Makefile, which is outside `web/`: please add `make dev-web` that runs that command. There is no `Makefile` in the repo yet. Chip memory pops one posted batch on a successful undo; answer posting is still B-02, so the shell's only client write is context.

---

### [B-02] Interview screen — Agent B1 — 2026-10-24 19:51
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS
  ```
  Test Files  9 passed (9)
       Tests  27 passed (27)
  ── contract
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (b)
  ```
- **Changed:** `web/src/screens/InterviewScreen.tsx`, `web/src/interview.test.tsx`, `web/src/teller.tsx`, `web/src/teller.test.tsx`, `web/src/App.tsx`, `web/src/types.ts`, `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - Shown level is the words Clear, Caution, or High, a colour (`#166534` / `#b45309` / `#991b1b`), and a slot at position 0, 1, or 2. `data-level` is the fixture token. Score, reason labels, and `pattern_label` are the fixture strings. Nothing is derived from the score (§12, §11.2; card spot check "Caution" at 16). `raw_level` is not the label, so T1's first answer stays Caution while raw is clear (§6.3 hysteresis, as carried on `risk.level`).
  - Counterpoint prefix is "In their favor:" at Caution or High and "Still noted:" at Clear, on its own line (§6.5). A recommended stop shows "You have enough to decide, or ask one more" and keeps the question at opacity 0.55 (§8.4, §12). A hard stop renders no question. Those three strings are not in `GET /library`; CHANGE-003 leaves `stop.reason` machine-readable, so it is on `data-reason` and, for a hard stop, is the visible text.
  - The opener renders library purposes, then a 72px row of five answer chips. A chip posts only after a purpose is chosen, as `{question_id, chip, purpose}`. Later questions post `{question_id, chip}` and omit `purpose`. No `note` (§5.6, §11.1, §9).
  - Client memory is a stack of context batches and answers. Undo pops one write, so undoing an answer does not drop posted context chips (§11.1).
- **Questions logged:** none
- **The next agent needs to know:** Screenshots of T1 Caution 16, T3 "Looks like: bank impersonation", and T6's hard stop were skipped (driver). Those three checks are tests in `web/src/interview.test.tsx`. Rendering and `POST /answers` were verified against contract fixtures through the web mock and a fetch stub, not against A's running API. The client still prefixes paths with `VITE_API_URL` (the stub used `http://api.test`). `docs/CROSS_LANE.md` is not on this branch; the copy on `cursor/cross-lane-log-760f` has no open A→B items, and this card logged no B→A items. Talk tracks are still not drawn on the interview screen. Outcome buttons stay on `/sessions/:id/outcome`.

---

### [B-03] Outcome, handoff, real API — Agent B1 — 2026-10-24 20:07
- **Status:** done (CP2 awaits driver confirmation; do not merge)
- **Gate:** `scripts/gate.sh b` → PASS
  ```
  Test Files  11 passed (11)
       Tests  37 passed (37)
  ── contract
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (b)
  ```
- **Changed:** `web/src/screens/OutcomeScreen.tsx`, `web/src/screens/HandoffScreen.tsx`, `web/src/outcome.test.tsx`, `web/src/handoff.test.tsx`, `web/src/App.tsx`, `web/src/teller.tsx`, `web/src/types.ts`, `web/src/validate.ts`, `web/mock/replay.ts`, `web/src/mockReplay.test.ts`, `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - All four outcome buttons stay enabled at every fixture step. The highlighted button is `suggested_outcome`. Report is never highlighted, including if a payload names it. Highlight is colour `#fef3c7` plus `data-highlighted` (§11.2, §18.1).
  - Submit posts `{outcome, actor}` and omits `note`. The actor must be non-blank after trim, and the teller must choose an outcome; the suggestion is not pre-selected (§11.1, §11.2). Button words are Proceed, Slow down, Escalate, and Report from §18.1. The actor control is labeled Actor. Those strings are not in `GET /library` (Q-006).
  - Handoff is `GET /sessions/:id/handoff`. The mock copies `session_id`, `mode`, `stated_purpose`, `risk`, `suggested_outcome`, `answers`, and `stop` off the current fixture step. The screen renders that projection. A shape mismatch shows the contract banner and does not invent fields (Q-006). Purpose labels still come from `GET /library`. Level words match the interview screen. `stop.reason` stays machine-readable.
  - A successful mock `POST /outcome` returns the current `SessionState` and then rejects further posts with `409` `session_closed`. Outcome is not written onto the state (Q-011). Fixtures still have no outcome step (Q-009).
- **Questions logged:** none
- **The next agent needs to know:** **CP2 awaits driver confirmation.** Do not merge this PR until the drivers confirm CP2 with A. Screenshots of the outcome buttons and the handoff route were skipped (driver). Those checks are tests in `web/src/outcome.test.tsx` and `web/src/handoff.test.tsx`. Hour-8 integration ran A's API from `origin/main` (`7f4f546`, uvicorn on 127.0.0.1:8000, `RECOMMENDER=rules`). T1 and T2 were walked by posting each fixture request (the bodies the chips send). Every `SessionState` matched the fixture except `session_id`, which the API assigns. `GET /handoff` matched the same projection with that id. `GET /library` validated against `library.schema.json`. It has five patterns and five look-alikes; `contract/library.json` has two, which Q-008 already allows. Chip, purpose, and question copy for these steps matched. No UI patch. `docs/CROSS_LANE.md` is not on this branch; `cursor/cross-lane-log-760f` has no open A→B items, and this card logged no B→A items. The live handoff projection does not include the recorded outcome or actor. Talk tracks are still not drawn.

---

### [B-03] Handoff outcome and actor — Agent B1 — 2026-10-24 20:26
- **Status:** done (CP2 still awaits driver confirmation; do not merge)
- **Gate:** `scripts/gate.sh b` → PASS
  ```
  Test Files  11 passed (11)
       Tests  38 passed (38)
  ── contract
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (b)
  ```
- **Changed:** `web/src/types.ts`, `web/src/validate.ts`, `web/src/screens/HandoffScreen.tsx`, `web/src/handoff.test.tsx`, `web/src/teller.tsx`, `web/mock/replay.ts`, `web/src/mockReplay.test.ts`, `docs/HANDOFF.md`, `docs/CROSS_LANE.md`
- **Decisions I made, and the section that justified each:**
  - `HandoffProjection` matches applied `handoff.schema.json`: `outcome` is `proceed`, `slow_down`, `escalate`, `report`, or null; `actor` is a string or null. Both are null until `POST /outcome` (CHANGE-004, §11.1).
  - The Handoff screen shows "Outcome: not recorded yet" and "Actor: not recorded yet" when those fields are null, and the outcome label plus the actor string when they are set (§12).
  - `GET /handoff` is validated with Ajv against `contract/handoff.schema.json`. A body that omits the fields or names an unknown outcome is not rendered.
  - The mock keeps the posted outcome and actor and returns them on the next `GET /handoff`. `SessionState` still omits both (Q-011). The handoff body does not include `note`.
- **Questions logged:** none. X-001.
- **The next agent needs to know:** This branch includes `origin/main` through `b94749b` (PR #23 and PR #24). The live API in that tree returns the fields. A TestClient call to `api/main.py` got `outcome: null` and `actor: null` before `POST /outcome`, then `outcome: "escalate"` and `actor: "teller-1"` after. Both bodies validated against `handoff.schema.json`. `SessionState` did not include the fields. **CP2 still awaits driver confirmation.** Do not merge. X-001: `contract/handoff.schema.json` description still says CHANGE-004 is not applied.

---

### [CHANGE-004] Handoff schema description wording — Agent R — 2026-10-24 20:32
- **Status:** done
- **Gate:** `scripts/gate.sh contract` → PASS; `scripts/gate.sh a` → PASS

```
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (contract)
```

```
── ruff
All checks passed!

── pytest
85 passed, 1 warning in 10.54s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** `contract/handoff.schema.json` (top-level `description` string only); `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - Replaced leftover `Pending CHANGE-004 (not applied).` with `CHANGE-004 (applied).` in the schema description. CHANGE-004 is already applied and approved (PRs #22, #23, #24; `contract/CHANGES.md`, `contract/api.md`).
  - Left the 20:13 HANDOFF proposal entry as written (this file is append-only; that entry was accurate at proposal time).
  - Did not edit `api/`, `web/`, fixtures, `reference_impl.py`, or `tests/golden/`. Schema fields, required keys, and `CONTRACT_VERSION` are unchanged.
- **Questions logged:** none
- **The next agent needs to know:**
  - PR #27 is wording-only. Do not merge unless a driver says so.
  - `contract/` and `docs/` have no remaining live “pending CHANGE-004” / “not applied” wording. `handoff.schema.json` is not in `contract/oracle.sha256`.
  - No new dependency.

---

### [merge] origin/main into b-01-scaffold — Agent B1 — 2026-10-24 20:35
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS; `scripts/gate.sh a` → PASS

```
── typecheck
── lint
── test
 Test Files  11 passed (11)
      Tests  38 passed (38)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
GATE PASS (b)
```

```
── ruff
All checks passed!
── pytest
85 passed, 1 warning in 10.99s
── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
GATE PASS (a)
```

- **Changed:** merge commit only. Conflicts: `docs/HANDOFF.md` (kept every section from both sides, newest last); `docs/CROSS_LANE.md` (kept both X-001 entries); `docs/DECISIONS.md` (main; Hour 8 filled, nothing unique on the branch); `contract/handoff.schema.json` (main, unchanged). `web/` stayed the branch version.
- **Decisions I made, and the section that justified each:** none. Driver instruction: append-only shared docs; main for contract/api/engine/store/goldens/fixtures/`reference_impl.py`; branch for `web/`.
- **Questions logged:** none
- **The next agent needs to know:** This is a merge of `origin/main` (`b2db873`) into `b-01-scaffold`. No new branch or PR. Q-012 is still in `docs/QUESTIONS.md`. Both CROSS_LANE X-001 entries are present (main: missing outcome/actor, resolved; branch: schema description still said not applied, still open in the log). The schema file on this tree is main's `CHANGE-004 (applied).` wording.

---

### [A2] make dev-web — Agent A2 — 2026-10-24 20:37
- **Status:** done
- **Gate:** `scripts/gate.sh a` → PASS

```
── ruff
All checks passed!

── pytest
85 passed, 1 warning in 10.34s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** `Makefile`; `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - `make dev-web` runs `npm run dev` from `web/` in tmux session `teller-web`, matching `make dev-api` and WORKFLOW §2.4 / B-01. Vite already binds 127.0.0.1:5173; the mock is middleware on that server; `VITE_API_URL` overrides the API base (B-01 HANDOFF, PR #5).
- **Questions logged:** none (Q-012 is route paths, not this target)
- **The next agent needs to know:** `make dev-web` starts Vite detached in tmux (`teller-web`). Empty `VITE_API_URL` uses the Vite origin (mock). Set `VITE_API_URL=http://127.0.0.1:8000` to hit `make dev-api`. No `web/` edits. Do not merge unless a driver says so. No new dependency.

---

### [A-05] Model path — Agent A2 — 2026-10-24 20:40
- **Status:** done (implementation and gate). **Live-path p95: PENDING Driver B** (no GPU here; fakes only).
- **Gate:** `scripts/gate.sh a` → PASS (`RECOMMENDER=rules`)

```
── ruff
All checks passed!

── pytest
94 passed, 1 warning in 12.26s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** `recommenders/**`, `engine/prompt.py`, `api/main.py` (`/health` + recommender wiring in `render`/`create_app` only), `tests/recommenders/**`, `.importlinter` (`recommenders` is now a root package), `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - Default local model ID is `Meta-Llama-3.1-8B-Instruct-Q4_K_M` when `RECOMMENDER` is `local`/`local_llm`/`hosted`/`hosted_llm` (DECISIONS Hour 6; §15 `MODEL_ID`). The 3B (`Llama-3.2-3B-Instruct-Q4_K_M`) is the operational fallback: restart `llama-server` on that GGUF and set `MODEL_ID`.
  - `RECOMMENDER=rules` (default) does not construct a model client and does not append `RecommendationIssued`, so T1–T7 replay and goldens stay identical (§7.3 floor).
  - Prompt builder is an allowlist (`engine/prompt.py`, §8.1 / §10.2). Notes, `amount_band`, and `account_ref` are never copied in. Adding a SessionState field does not add it to the prompt.
  - Validator is shared (`recommenders.validate`); LocalLLM sends a per-request GBNF (§8.2); HostedLLM does not assume a grammar. Timeout is 1500 ms (§8.3). Strict mode forces `signals_asserted=[]` and skips the call outside probe or after any stop (§7.4, §9).
  - `/health` adds `p50`, `p95`, `rejection_count` and keeps `last_p95` as an alias of `p95` (card step 7; §16). Agreement is model-output vs `rule_choice`; timeouts are fallbacks, not agreement samples.
  - No new dependency.
- **Questions logged:** none
- **The next agent needs to know:**
  - Boot: `RECOMMENDER=rules|local_llm|hosted_llm`, `MODEL_ID`, `MODEL_TIMEOUT_MS=1500`, `STRICT_MODE=true`, `LLAMA_SERVER=http://127.0.0.1:8080`, `HOSTED_LLM_URL`, `HOSTED_LLM_API_KEY`.
  - Inject a fake in tests: `create_app(..., recommender="local_llm", recommender_impl=fake, metrics=Metrics())`.
  - This environment did not run a real model. Do not treat `/health` p50/p95 from the unit tests as the live number.

  **PENDING Driver B — live-path p95 (not `scripts/bench_llm.py`).** On the GPU laptop, start `llama-server` with the 8B Q4_K_M (same flags as A-03: `-ngl 99 -c 4096 -np 1`), then:

```
scripts/with-gpu env RECOMMENDER=local_llm \
  MODEL_ID=Meta-Llama-3.1-8B-Instruct-Q4_K_M \
  MODEL_TIMEOUT_MS=1500 \
  LLAMA_SERVER=http://127.0.0.1:8080 \
  python3 - <<'PY'
import json
from pathlib import Path
from fastapi.testclient import TestClient
from api.main import create_app

app = create_app(
    db_path=Path("/tmp/teller-live-8b.sqlite"),
    recommender="local_llm",
    model_id="Meta-Llama-3.1-8B-Instruct-Q4_K_M",
)
steps = json.loads(Path("contract/fixtures/T2.json").read_text())["steps"]
with TestClient(app) as client:
    session_id = None
    for step in steps:
        endpoint, body = step["endpoint"], step["request"]
        if endpoint == "POST /sessions":
            session_id = client.post("/sessions", json=body).json()["session_id"]
        elif endpoint.endswith("/context"):
            client.post(f"/sessions/{session_id}/context", json=body)
        else:
            client.post(f"/sessions/{session_id}/answers", json=body)
    print(json.dumps(client.get("/health").json(), indent=2))
PY
```

  Paste `p50` / `p95` from that `/health` into a new HANDOFF line. That is the live-path number the card wants.

  **PENDING — 8B vs 3B quality (DECISIONS Hour 6).** Driver B must not read `eval/scenarios/dev/` (ROSTER §2). Repeat the block above after switching `llama-server` to `Llama-3.2-3B-Instruct-Q4_K_M` and `MODEL_ID=Llama-3.2-3B-Instruct-Q4_K_M` (use `/tmp/teller-live-3b.sqlite`). Compare T2 probe `question.id` values and `agreement_rate`. Driver A can run the same API against A3's `eval/scenarios/dev` once those exist. Prefer 8B if it picks a different valid probe that better splits the leading pattern; otherwise 8B stays the default and 3B stays the VRAM/fallback.

---

### [merge] origin/main into a2-a05-model-path — Agent A2 — 2026-10-24 20:45
- **Status:** done
- **Gate:** `scripts/gate.sh a` → PASS

```
── ruff
All checks passed!

── pytest
94 passed, 1 warning in 12.82s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** merge commit plus this entry. Conflicts: `docs/HANDOFF.md` only (kept main's `[A2] make dev-web` and the branch's `[A-05] Model path`, newest last). Auto-merged from main: `Makefile` (`make dev-web`), `docs/A_TO_B.md`, `docs/B_TO_A.md`, `docs/CROSS_LANE.md`, `docs/QUESTIONS.md`.
- **Decisions I made, and the section that justified each:** none. Driver instruction: keep both HANDOFF sides; keep main's `make dev-web`; take main for contract/reference_impl/goldens/fixtures/web/CROSS_LANE/QUESTIONS/A_TO_B/B_TO_A; keep the branch for recommenders/, engine/prompt.py, api health/recommender wiring, tests/recommenders. Did not change A-05 logic.
- **Questions logged:** none
- **The next agent needs to know:** Merge of `origin/main` (`d3919f2`) into `cursor/a2-a05-model-path-9aea` (PR #30). No new PR. Live-path p95 and 8B vs 3B quality are still PENDING Driver B (see the `[A-05]` entry). No new dependency.

---

### [X-003] 8B startup warm-up — Agent A2 — 2026-10-24 21:15
- **Status:** done (implementation + mocked-server tests). Live GPU re-check PENDING Driver B.
- **Gate:** `scripts/gate.sh a` → PASS

```
── ruff
All checks passed!

── pytest
121 passed, 1 warning in 18.20s

── import-linter
Engine does not import api, store, or recommenders KEPT
Contracts: 1 kept, 0 broken.

── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```

- **Changed:** `recommenders/local_llm.py` (`LocalLLM.warmup`); `api/main.py` (lifespan warm-up when `local`/`local_llm`); `tests/recommenders/test_warmup.py`; `ARCHITECTURE.md` (added `test_warmup.py`); `docs/A_TO_B.md` (M-006); `docs/HANDOFF.md`
- **Decisions I made, and the section that justified each:**
  - Bounded wait in FastAPI lifespan, not a fire-and-forget thread, so B's TestClient live-path script is already warm when the first probe runs (L1b / §8.3; X-003).
  - Warm-up timeout is `MODEL_WARMUP_TIMEOUT_MS` default 15000, not the live 1500 ms, because the cold hit is the thing that exceeded 1500 ms. Live path still uses 1500 ms.
  - Warm-up uses the same `/completion` shape and the §8.1 stable prefix (library vocab) with `cache_prompt`, and is never passed to `Metrics.record_attempt` (§16).
  - Connection errors are swallowed so boot works with no llama-server (L2). Injected fakes and `RECOMMENDER=rules` skip warm-up.
  - No contract, schema, golden, or `reference_impl.py` change. No new dependency.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/44. Driver B: start llama-server (8B Q4_K_M), then the first live-path request after that start (same `scripts/with-gpu` block in the [A-05] entry). Reply in `docs/B_TO_A.md` or the M-006 **B reply** line. Do not merge until that check. `docs/CROSS_LANE.md` was not edited.
