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
