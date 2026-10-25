### Fit Home to the 1024×576 stage — Agent B — 2026-10-25 15:10
- **Status:** done
- **Gate:** `scripts/gate.sh a` → PASS
  ```
  216 passed, 1 warning in 27.22s
  Contracts: 1 kept, 0 broken.
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (a)
  ```
  `scripts/gate.sh b` → PASS
  ```
  Test Files  59 passed (59)
  Tests  229 passed (229)
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (b)
  ```
  `scripts/gate.sh contract` → PASS
  ```
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (contract)
  ```
- **Changed:** `web/src/theme/ThemeRoot.tsx`, `web/src/index.css`, `web/src/App.tsx`, `web/src/screens/HomeScreen.tsx`, `web/src/workstation/Toolbar.tsx`, `web/src/workstation/TransactionPanel.tsx`, `web/src/workstation/StepSwap.tsx`, `web/src/workstation/CopilotStrip.tsx`, and the Home/copilot tests those files already had (`homeRedesign`, `home`, `homeViewport`, `copilotScroll`, `scoreExplanation`, `demoPolish`, `privacy`, `typeHierarchy`, `timelineDim`, `workstationMerge`).
- **Decisions I made, and the section that justified each:**
  - Home is one letterboxed 16:9 stage (`container-type: inline-size`, `--u: calc(1cqw / 10.24)`). Width is `min(100vw, calc(100dvh * 16 / 9))`. `100dvh` matches the viewport lock already on the theme root. The stage does not scroll and does not grow with content. Cards scroll inside themselves.
  - Left card is x 33–330, y 98–520, radius 45. It holds the scenario dropdown and the small back / play / step arrows. The timeline list and the “Event N of N” bar are not rendered. `revealCurrentStep` stays in `TransactionPanel.tsx` because `homeViewport` still unit-tests it.
  - The current step is a sibling card at x 141–508, y 432–520, so it can overlap the left card and extend past x 330. The swap animation is clipped by that card. An idle visit still mounts the swap with the caption “Customer File” (hidden) so presenter and shortcut tests keep a caption before the first step. A fired step keeps `event-marker` on the entering line.
  - Case file facts stay behind **Show case file** inside the left card. Default is closed (`App` `showCase` starts false). Opening it scrolls inside the card and does not change the card box.
  - 1× / 2× / 4×, restart, and the elapsed timer sit in `.tc-footer-utilities`, right-aligned above the dot line. Restart is also keyboard R. They are not in the left card. Play / Pause words stay in a clipped `.tc-play-label` so the control-height check still reads them. The visible control is the icon.
  - Copilot heading is fixed, escalate and undo are fixed, and `.tc-strip-body` is the only scrollport. Confirmed signal rows use a text-colored outline. The score explanation covers the copilot panel (`inset: 0`) and keeps Close in a bar. Outcome and Handoff use the same stage and scroll internally.
  - “Teller Copilot” and the simulation pill stay in the DOM, parked off the stage, so header tests still find them. The theme control stays Light / Dark / System. Type scales by overriding `--tc-text-*` and `--tc-type-*` on `.tc-stage`, not with raw `font-size` lines. Older 3fr/2fr rules remain so source assertions still match. tellr’s gradient is unchanged; pnc, mtb, and fnb keep their palettes.
  - Did not edit `docs/HANDOFF.md`, `docs/A_TO_B.md`, `ARCHITECTURE.md`, `reference_impl.py`, `contract/`, or golden weights. This sandbox PR does not change the A/B contract, so the cross-lane board stays as it is. `web/` does not compute risk, level, reasons, or the next question (architecture §9).
- **Questions logged:** none
- **The next agent needs to know:** Draft PR against `sandbox/home-redesign`. Do not merge. The left card is `overflow: auto` (the tools row is sticky). Do not add a content-driven min-height. The parked header title is off-stage on purpose.
