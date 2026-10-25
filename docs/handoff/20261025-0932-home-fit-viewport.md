### [B] Home fits the demo window; timeline and signal list scroll inside — Agent B1 — 2026-10-25 05:32
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS
  ```
  Test Files  56 passed (56)
       Tests  201 passed (201)
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (b)
  ```
- **Changed:** `web/src/index.css`, `web/src/theme/tokens.ts`, `web/src/theme/typeScale.ts`, `web/src/workstation/TransactionPanel.tsx`, `web/src/homeViewport.test.tsx`, `web/src/copilotScroll.test.tsx`, `web/scripts/measure-home-viewport.mjs`, `ARCHITECTURE.md`, this file
- **Decisions I made, and the section that justified each:**
  - Home stays a `100dvh` grid. At `max-height: 860px` and `760px`, shared `VIEWPORT_FIT` tokens tighten spacing and leading. `--tc-space-4` stays 16px. Root size is 87.5%. Body copy stays 14px. Controls stay 36px.
  - The timeline list fills the leftover height in the left column and scrolls inside that box (`overflow-y: auto`). `revealCurrentStep` moves only that list so the highlighted step stays fully visible. The page does not grow.
  - The copilot panel is `height: 100%` / `max-height: 100%` of the right column. Only `ul[aria-label='Signals']` scrolls. Level, score, suggested action, and Undo/Escalate are siblings and stay pinned. Scrollbars are thin and use `currentColor` at 40% so all four themes match. No new chrome.
  - Did not edit signal-row markup in `CopilotStrip.tsx`. Another agent is changing that list's row rendering. The scrollport must stay that `ul` as a direct child of `.tc-strip-body`.
  - `web/` still does not compute risk, level, reasons, or the next question. Did not edit `contract/`, `reference_impl.py`, golden tests, weights, or `docs/HANDOFF.md`.
- **Questions logged:** none
- **The next agent needs to know:** Keep new signal rows inside `ul[aria-label='Signals']`. Do not wrap that list, and do not put Undo or Escalate inside it. Timeline auto-scroll is `revealCurrentStep` on `[data-current="true"]`; it sets `scrollTop` on the timeline only. Headless check: `node web/scripts/measure-home-viewport.mjs http://127.0.0.1:5173` (48 runs: 3 sizes × 4 themes × light/dark × 2 scripts, then 20 cloned rows).
