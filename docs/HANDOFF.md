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

