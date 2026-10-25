# Handoff

### [B] Signal origin badge below the label — Agent B1 — 2026-10-25 08:55
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS (typecheck, lint, 197 tests, contract OK)

```
── typecheck
── lint
── test
 Test Files  55 passed (55)
      Tests  197 passed (197)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/workstation/CopilotStrip.tsx`, `web/src/index.css`, `web/src/copilotCard.test.tsx`, `docs/handoff/20261025-0855-signal-badge-below.md`
- **Decisions I made, and the section that justified each:**
  - The copilot origin badge (`data-testid="signal-origin"`, "Teller confirmed") is a column under the signal text. `.tc-signal-meta` is `flex-direction: column` and `flex-wrap: nowrap`, so a short label cannot keep the pill on the same line. The label stretches and wraps (`overflow-wrap: break-word`). The pill stays `width: max-content` and start-aligned. Architecture: shared `--tc-*` tokens, no bank-id branch, so tellr / pnc / mtb / fnb share the rule.
  - The row stays `display: flex`, `flex-wrap: nowrap`, `align-items: center`. Confirm and dismiss stay in `.tc-signal-actions` (`flex: 0 0 auto`) on the right, vertically centered on the row. Row height grows by the badge line.
  - Gap between the label and the badge is `--tc-space-1` (4px). Gap between the text block and the buttons, and between the buttons, is `--tc-space-2` (8px).
  - Observed rows still omit the badge. That pill was removed on main; this change adds no label, pill, or indicator. Score line, explanation overlay, Home layout, timeline, and `feed.ts` are untouched. The explanation origin pill still uses `.tc-factor-head`, not `.tc-signal-meta`.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/135. Do not merge. No screenshots. No contract, engine, library, or golden edits.
