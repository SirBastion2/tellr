# Handoff

### [B] Score explanation overlay — Agent B1 — 2026-10-25 08:42
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS (typecheck, lint, 195 tests, contract OK)

```
── typecheck
── lint
── test
 Test Files  54 passed (54)
      Tests  195 passed (195)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/workstation/CopilotStrip.tsx`, `web/src/screens/HomeScreen.tsx`, `web/src/index.css`, `web/src/scoreExplanation.test.tsx`, `web/src/workstation.test.tsx`, `docs/handoff/20261025-0842-score-explanation-overlay.md`
- **Decisions I made, and the section that justified each:**
  - The control is a `tc-btn` secondary pill (`controlStyle` radius `999px`, secondary colors, `--tc-space-1` / `--tc-space-2` padding) on the urgency-score line, immediately after the score value. `aria-expanded` toggles the overlay. No new tokens.
  - The overlay is `position: absolute` under that score block, inset to the copilot panel width, `max-height: 100vh` / `100dvh`, and `overflow-y: auto`. It uses `--tc-surface` and `--tc-text`. Closed with the `hidden` attribute so it does not push the page and stays out of the accessibility tree until opened. Escape, the same control, and a click outside close it. There is no second close control.
  - `ExplanationPanel` is unchanged and still owns the explanation copy and test ids. It stays mounted inside the overlay (hidden while closed) so existing content queries keep working. `workstation.test.tsx` opens the control before the one visible-text assertion that used to see the bottom section.
  - Home only stops rendering that panel as a sibling under the workstation and passes activity into the copilot. The Home grid, toolbar, and transaction panel were not edited.
- **Questions logged:** none
- **The next agent needs to know:** `ARCHITECTURE.md` was not edited. No files moved. `HomeScreen` still composes the copilot; Why this level is no longer a bottom sibling. Overlay rules are `.tc-score-line`, `.tc-explain-anchor`, and `.tc-explain-overlay` in `web/src/index.css`. Do not restyle the Home grid in this area. The panel is hidden, not unmounted, while the overlay is closed.
