### Portrait phone layout — Agent B — 2026-10-26 18:50
- **Status:** done
- **Gate:** not run. Task asked for the web unit tests that read the changed CSS, not `scripts/gate.sh`.
  ```
  npx vitest run src/portrait.test.tsx src/homeViewport.test.tsx src/homeRedesign.test.tsx src/handoff.test.tsx src/scoreExplanation.test.tsx src/workstationFit.test.tsx src/headerRhythm.test.tsx src/headerSimPill.test.tsx src/copilotScroll.test.tsx src/a11y.test.tsx src/scheme.test.tsx src/typeHierarchy.test.tsx src/copilotTheme.test.tsx src/themeConsistency.test.tsx src/outcome.test.tsx src/home.test.tsx src/copilotCard.test.tsx
  Test Files  16 passed, 1 failed (homeRedesign “scrolls the current step card” — same failure on sandbox/integration before this CSS)
  ```
- **Changed:** `web/src/index.css`, `web/src/portrait.test.tsx`
- **Decisions I made, and the section that justified each:**
  - At `max-width: 480px` the 16:9 stage is turned back into a scrolling page and the case file sits above the copilot. Architecture workstation section: below 900px the columns stack, and page scroll handles overflow. The stage rules above 480px are untouched.
  - Header groups wrap, and the playback controls (arrows, play, dots, restart, time) are at least 44px. The header one-row rule stays for every wider viewport.
  - Outcome choices and the handoff summary use one column so they stay inside the card. The score overlay is `100dvh` with Close outside the scroller. Colors stay on `--tc-surface` / `--tc-text`.
- **Questions logged:** none
- **The next agent needs to know:** phone rules are the last block in `web/src/index.css` and use `!important` only to beat the inline stage lock. `homeRedesign` still expects the current step dot to be first in the DOM; `Toolbar.tsx` renders dots in order, and that mismatch is older than this branch.
