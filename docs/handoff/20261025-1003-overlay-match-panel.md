# Handoff

### [B] Score explanation overlay matches the copilot panel — Agent B1 — 2026-10-25 10:03
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS (typecheck, lint, 212 tests, contract OK)

```
── typecheck
── lint
── test
 Test Files  57 passed (57)
      Tests  212 passed (212)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/index.css`, `web/src/workstation/CopilotStrip.tsx`, `web/src/scoreExplanation.test.tsx`, `docs/A_TO_B.md`, `docs/handoff/20261025-1003-overlay-match-panel.md`
- **Decisions I made, and the section that justified each:**
  - The overlay's containing block is `.tc-strip` (`position: relative`). It is `position: absolute`, `width: 100%`, `left: 0`, `right: 0`, `bottom: 0`. That shares the copilot panel's left and right edges and keeps the bottom edge on the panel's inner bottom. It is no longer `position: fixed` and no longer anchored to the score control or the viewport.
  - `--tc-explain-pin` is the measured bottom of the level / Urgency Score / reason block, so the sheet starts under that block. The Score explanation control stays visible and is still the close control. Headless Chrome (no screenshots) at 1280×720, 800×480, and 390×480 showed left, right, and bottom deltas of 0 against the panel, and the control above the sheet.
  - Scroll, pin, and dismiss behavior from #146 stays: `.tc-explain-overlay-body` is the only scroller, `.tc-explain-overlay .tc-title` is sticky, and Escape, an outside click, and the Score explanation control close it. `hidden` still removes it. The portal and the theme-variable copy are gone; the sheet inherits `--tc-surface` and `--tc-text`.
  - `max-height: min(100%, 100dvh)` (100vh fallback) and `max-width: min(100%, 100vw)`, with `100%` first, keep the sheet inside the panel and the window. The old 16px viewport inset is gone because it pulled the right and bottom edges off the panel. No per-theme rule. No new control. `web/` does not compute risk, levels, reasons, or the next question.
- **Questions logged:** none
- **The next agent needs to know:** `ARCHITECTURE.md` was not edited. No files moved. Overlay rules are `.tc-copilot-pin`, `.tc-explain-overlay`, `.tc-explain-overlay[hidden]`, `.tc-explain-overlay-body`, and `.tc-explain-overlay .tc-title` in `web/src/index.css`. Do not put the overlay back on `document.body` or give it `anchor-name`. The Home fit pass still owns `.tc-strip` height.
