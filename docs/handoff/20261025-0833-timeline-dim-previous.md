### [B] Dim earlier Home timeline steps — Agent B1 — 2026-10-25 08:33
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS
  ```
  Test Files  54 passed (54)
       Tests  195 passed (195)
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (b)
  ```
- **Changed:** `web/src/workstation/TransactionPanel.tsx`, `web/src/index.css`, `web/src/timelineDim.test.tsx`, this file
- **Decisions I made, and the section that justified each:**
  - Home timeline rows before the current step (`index < shown - 1`) get `data-past="true"`. CSS sets that row to `opacity: 0.55`. The current step is not marked past, so it keeps the existing accent dot and `--tc-input` highlight at full brightness. Unreached events are still not rendered (architecture workstation section: the timeline lists fired steps).
  - Opacity, not a fixed gray, so tellr, pnc, mtb, and fnb keep their own ink in light and dark. 0.55 matches the dismissed signal row and disabled-control dim already in `index.css`. No new labels, markers, type, or spacing.
  - `web/` still does not compute risk, level, reasons, or the next question. Did not edit `contract/`, `reference_impl.py`, golden tests, weights, `docs/HANDOFF.md`, or `ARCHITECTURE.md`.
- **Questions logged:** none
- **The next agent needs to know:** Keep `data-past` only on steps before the current one. `.tc-timeline > [data-past='true']` is the dim. A layout edit to `TransactionPanel.tsx` should leave that attribute and the step text alone. `onToggleCase` is required on the panel after the case-file link move; this test passes a no-op.
