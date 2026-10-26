### Home step hover and sandbox layout — Agent B — 2026-10-25 16:10
- **Status:** done
- **Gate:** `scripts/gate.sh a` → PASS
  ```
  216 passed, 1 warning in 24.21s
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
- **Changed:** `web/src/index.css`, `web/src/screens/HomeScreen.tsx`, `web/src/screens/OutcomeScreen.tsx`, `web/src/screens/HandoffScreen.tsx`, `web/src/ui/icons.tsx`, `web/src/workstation/CopilotStrip.tsx`, `web/src/workstation/Toolbar.tsx`, `web/src/workstation/TransactionPanel.tsx`, `web/src/homeRedesign.test.tsx`, `web/src/homeViewport.test.tsx`, `web/src/outcome.test.tsx`, `web/src/themeConsistency.test.tsx`, `web/src/demoPolish.test.tsx`, `web/src/scheme.test.tsx`, `web/src/headerSimPill.test.tsx`, `web/src/shortcutsAfterClick.test.tsx`, `web/src/handoff.test.tsx`.
- **Decisions I made, and the section that justified each:**
  - The step card stays in the DOM (`aria-live="polite"`). It is `opacity: 0` and `pointer-events: none` until the left card is hovered or focused, the card itself is hovered or focused, or playback advances a step (`data-revealed="pulse"` for 2.5s). Reduced motion drops the fade (`transition: none`). Architecture §9: the client does not choose the next question; it only shows the step the demo already posted.
  - Case-file facts stack in one column on the stage and scroll inside `.tc-transaction`. The left card itself is `overflow: hidden` with bottom padding so the list stops above the step card. Line-height uses `--tc-text-base-lh` so the line box is not shorter than the glyph. The shared 2-column `.tc-kv` rule is unchanged, so the 1280 fact-grid measurement still sees a 16px column gap.
  - The score explanation stays `background: var(--tc-surface)` and `position: absolute; inset: 0`. Its z-index is 8, and the copilot strip rises to z-index 6 while the overlay is open, so the step card cannot show through.
  - The scenario select is `width: 100%` of the toolbar next to the arrows. The 150u cap is gone.
  - Footer dots are 11u (current 16u). Restart and the elapsed timer are 22u, with the credit lower in the footer band. The 1×/2×/4× group is removed. This note first said the left arrow sped up and the right arrow slowed down, with the speed label only above 1×. That mapping is replaced: the Right arrow speeds playback up (1×→2×→4×, disabled at 4×), the Left arrow slows playback down and is enabled only above 1×, and the speed label stays visible between the arrows. Keyboard Right and Left use that same mapping and stay inactive while typing or with Ctrl, Cmd, or Alt. Keyboard N still steps. A visually hidden `demo-step` button keeps the existing click tests. Seeking an earlier footer dot is how the step card moves backward.
  - Undo is a round frosted disc (`rgba(176, 190, 224, 0.42)`, white hook arrow) on the same row as Escalate, at the same height, to its right. Escalate stays the light frost pill with dark text. Both are outside the signal scroller.
  - Outcome uses the same 16:9 stage. The glass card is the 193–818 by 114–515 box and scrolls in `.tc-outcome-body`. The urgency pill prints the server score with a `%` suffix (`session.risk.score`); it does not divide or recompute it (architecture §9, contract score maximum stays on the copilot `n/100` display). “N Questions Answered” is `session.answers`. The suggested card is an opaque surface with a 2px `highlightBg` outline and the text “Copilot's recommendation”. The selected card uses that bank’s `button` / `buttonText`, a check, and “Selected”. The record control is a round arrow with accessible name “Record decision”, disabled until a name and a choice are present. Closed visits still use `outcomeLabel` (“Slow down”).
  - Handoff reason rows are a column, so Observed / Teller confirmed sit on their own line under the signal text.
  - Did not edit `docs/HANDOFF.md`, `ARCHITECTURE.md`, `reference_impl.py`, `contract/`, or golden weights.
- **Questions logged:** none
- **The next agent needs to know:** Draft PR against `sandbox/home-redesign-exact`. Do not merge. Do not touch `main`. The left card no longer scrolls; `.tc-transaction` does. `demo-back` and `speed-control` are gone. `demo-step` is visually hidden and still advances the script.
