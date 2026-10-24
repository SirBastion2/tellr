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

