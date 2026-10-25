# Handoff

### [B] Score explanation overlay viewport cap — Agent B1 — 2026-10-25 09:34
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS (typecheck, lint, 207 tests, contract OK)

```
── typecheck
── lint
── test
 Test Files  57 passed (57)
      Tests  207 passed (207)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/index.css`, `web/src/workstation/CopilotStrip.tsx`, `web/src/scoreExplanation.test.tsx`, `docs/A_TO_B.md`, `docs/handoff/20261025-0934-explanation-overlay-cap.md`
- **Decisions I made, and the section that justified each:**
  - The overlay is one contiguous block in `web/src/index.css` (`.tc-explain-anchor` through `.tc-explain-overlay .tc-title`). `max-height` is `calc(100dvh - 2 * var(--tc-space-4))` with a `100vh` fallback, and `max-width` is `calc(100vw - 2 * var(--tc-space-4))`. The same `--tc-space-4` (16px) inset is on every side. `box-sizing` is `border-box`. No per-theme overrides.
  - It is `position: fixed`, anchored under the score block, and clamped with `bottom` and `right` set to that same margin so the box stays inside the viewport. If `anchor()` is unsupported, the four inset fallbacks still keep it inside the window.
  - The overlay is portaled to `document.body` so the workstation card's `backdrop-filter` is not the fixed containing block. Theme custom properties are copied from `[data-testid="theme-root"]` and refreshed when that style attribute changes, so tellr, pnc, mtb, and fnb stay on shared tokens in light and dark.
  - `overflow-y: auto` is only on `.tc-explain-overlay-body`. The shell is `overflow: hidden`. "Why this level" is sticky. The Score explanation control stays the close control. Escape and outside click are unchanged. The copilot card's flow is unchanged (the anchor is still height 0). No new labels or content.
- **Questions logged:** none
- **The next agent needs to know:** Keep overlay rules in that one CSS block. The Home fit pass owns `.tc-strip` max-height and the page `100dvh` lock; do not fold the overlay into those rules. Headless Chrome (no screenshots) at 1280×720, 1280×600, 800×480, and 390×480 kept the open overlay inside a 16px margin, scrolled the body, and left the Score explanation control hittable. After scrolling, the title stayed pinned in tellr, pnc, mtb, and fnb dark. Merged main `b7a3188`. No contract, engine, library, or golden edits.
