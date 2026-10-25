# Handoff

### [B] Home left column top align — Agent B1 — 2026-10-25 08:08
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS (typecheck, lint, 194 tests, contract OK)

```
── typecheck
── lint
── test
 Test Files  53 passed (53)
      Tests  194 passed (194)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/index.css`, `docs/handoff/20261025-0808-home-left-top-align.md`
- **Decisions I made, and the section that justified each:**
  - The copilot card (`.tc-strip`) insets its first content with `padding: var(--tc-space-card-fluid, clamp(10px, 1vw, 16px))`. That token is the right panel's inner top padding. `.tc-transaction` now uses the same `padding-top`, so the Transaction heading lines up with the level badge. The token is on `:root`, shared by tellr / pnc / mtb / fnb, and it tracks the card padding at every viewport.
  - The 1px card border is not part of that padding, so it is not added to the offset.
  - Toolbar, header pill, and `.tc-strip` are unchanged. `web/src/App.tsx` was not edited. No tests asserted the previous zero offset.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/129. Do not merge. Home only. The left column offset is `.tc-transaction` `padding-top`, equal to the copilot card padding token. Do not hardcode a pixel value. No contract, engine, library, or golden edits.
