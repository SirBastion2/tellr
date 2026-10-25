### [B] Drop Observed badge on copilot signal rows — Cloud agent — 2026-10-25 08:28
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS
  ```
  Test Files  53 passed (53)
       Tests  194 passed (194)
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (b)
  ```
- **Changed:** `web/src/workstation/CopilotStrip.tsx`, `web/src/copilotCard.test.tsx`, `web/src/workstationMerge.test.tsx`, this file
- **Decisions I made, and the section that justified each:**
  - Copilot signal rows (`CopilotStrip`, architecture workstation section) hide the origin pill only when `originText` is `Observed`. `Teller confirmed` still uses the same `signal-origin` / `tc-badge` span. No CSS, spacing, or button changes: `.tc-signal-meta` gap applies only between children, so the name sits in the same row beside the check and X.
  - Left `originText` and `factorOrigin` in `feed.ts` unchanged. They still return the origin string for the explanation list, handoff marks, and feed tests. This is display-only on the signal row. `web/` does not compute risk, level, reasons, or the next question.
  - Did not edit `contract/`, `reference_impl.py`, golden tests, weights, `docs/HANDOFF.md`, or `ARCHITECTURE.md`.
- **Questions logged:** none
- **The next agent needs to know:** Why this level already omits Observed on What raised it (`raisedOrigin`). What would lower it can still show an Observed pill. Copilot signal chips no longer do. A confirmed or teller-sourced chip still shows Teller confirmed.
