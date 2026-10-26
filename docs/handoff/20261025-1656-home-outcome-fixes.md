### Home outcome layout — Agent B — 2026-10-25 16:56
- **Status:** done
- **Gate:** `scripts/gate.sh a` → PASS
  ```
  216 passed, 1 warning in 24.66s
  Contracts: 1 kept, 0 broken.
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (a)
  ```
  `scripts/gate.sh b` → PASS
  ```
  Test Files  59 passed (59)
  Tests  231 passed (231)
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (b)
  ```
  `scripts/gate.sh contract` → PASS
  ```
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (contract)
  ```
- **Changed:** `web/src/App.tsx`, `web/src/index.css`, `web/src/screens/HomeScreen.tsx`, `web/src/screens/OutcomeScreen.tsx`, `web/src/teller.tsx`, `web/src/ui/icons.tsx`, `web/src/workstation/CopilotStrip.tsx`, `web/src/workstation/StepSwap.tsx`, `web/src/workstation/Toolbar.tsx`, `web/src/workstation/TransactionPanel.tsx`, `web/src/closedSession.test.tsx`, `web/src/home.test.tsx`, `web/src/homeRedesign.test.tsx`, `web/src/outcome.test.tsx`, `web/src/timelineDim.test.tsx`, `web/src/typeHierarchy.test.tsx`.
- **Decisions I made, and the section that justified each:**
  - The left card is two halves inside the card, not a floating bubble. The top half is the StepSwap card (`Step 1 · time · speaker` plus the redacted event text). The bottom half is always the case file, under a hairline, with Type, Amount, and Memo in the same small grid. Labels use a 40% column and wrap on spaces. Architecture §9: the client only renders the posted step and the synthetic file; it does not score.
  - The step on screen is labeled Step 1. Footer dots put that beat on the left. Older beats follow to the right. Later beats stay dim and are not `aria-current`. Playback arrows sit in that same row, immediately after the current dot, and stay visible when the dots are hidden.
  - Dots and the footer credit fade. Hover or focus inside the step half, or hover on the timeline row, shows the dots. The credit fades for that same hover so the two do not stack. The credit itself is centered on every stage page from `.tc-stage .tc-footer` (`!important` over theme `footerPlacement`, which is unchanged).
  - Copilot rows, badges, the score pill, and the level pill use a translucent mix of `--tc-text` on the glass fill, with a faint border and backdrop blur, matching the Outcome glass tokens. The centered “Copilot” heading stays. The urgency figure stays `n/100` inside `copilot-score`.
  - A recorded outcome (HTTP 200) navigates to Handoff. A closed visit stays on the Outcome glass card. All four outcome choices stay enabled.
  - The keyboard shortcuts dialog was left as it was on `sandbox/home-step-hover`. No shortcut component or shortcut stylesheet was changed in this commit.
  - Did not edit `docs/HANDOFF.md`, `ARCHITECTURE.md`, `reference_impl.py`, `contract/`, or golden weights. No new dependency.
- **Questions logged:** none
- **The next agent needs to know:** Draft PR against `sandbox/home-step-hover`. Do not merge. Do not touch `main`. The live Home screen does not mount `StepCard`; that export remains for the pulse test. `demo-step` is still the visually hidden stepper. The scenario menu is 170u so full titles fit. Restart and the elapsed timer stay at the right of the footer.
