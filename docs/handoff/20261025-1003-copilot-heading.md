### [B] Copilot panel heading — Agent B1 — 2026-10-25 10:03
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS

```
 Test Files  57 passed (57)
      Tests  213 passed (213)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/workstation/CopilotStrip.tsx`, `web/src/index.css`, `web/src/copilotScroll.test.tsx`, `docs/UI_REFERENCE.md`, `docs/A_TO_B.md`, this file
- **Decisions I made, and the section that justified each:**
  - The panel heading is an `h2` whose text is Copilot, so its accessible name is that word. The aside keeps `aria-label="Copilot"`. Architecture §12: the card renders the server snapshot and does not compute risk, level, reasons, or the next question. The heading is chrome, not a score.
  - Size, weight, and line-height come from the shared scale: `--tc-type-title`, `--tc-strong-weight` (700), and `--tc-type-line-heading`. Margin is 0. Separation from the level badge is the existing strip gap (`--tc-space-strip`). One rule, no per-bank or per-scheme override. Architecture themes: structure and type stay shared; only color, family, and the mark differ.
  - The heading is the first child of `.tc-strip-body`, so `.tc-strip-body > :not(ul)` pins it (`flex: 0 0 auto`) and `ul[aria-label="Signals"]` stays a direct child of that body (PR #144). The list is the only scrollport and shrinks by one title line plus the strip gap. Idle and the no-session placeholder use the same heading so the panel always has it. The heading rule is its own block, above the signal-list rule and away from `.tc-explain-overlay`.
  - Headless check after the gate: `node web/scripts/measure-home-viewport.mjs http://127.0.0.1:5173` exited 0 (3 sizes × 4 themes × light/dark × 2 scripts, then 20 cloned signal rows). Page and panel stayed inside 1470×780, 1440×760, and 1280×720.
- **Questions logged:** none
- **The next agent needs to know:** Do not wrap `ul[aria-label="Signals"]` or move the heading inside it. The overlay CSS is a later block; leave `.tc-strip-heading` where it is so those edits merge. PR https://github.com/SirBastion2/tellr/pull/153.
