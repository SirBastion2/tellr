# Handoff

### [B] Header pill spacing — Agent B1 — 2026-10-25 08:01
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

- **Changed:** `web/src/App.tsx`, `web/src/index.css`, `web/src/theme/tokens.ts`, `web/src/theme/vars.ts`, `web/src/theme/scheme.ts`, `web/src/headerRhythm.test.tsx`, `web/src/headerSimPill.test.tsx`, `web/src/themeConsistency.test.tsx`, `web/src/workstationFit.test.tsx`, `web/src/a11y.test.tsx`, `docs/handoff/20261025-0801-header-spacing.md`
- **Decisions I made, and the section that justified each:**
  - Spacing only. Colors, borders, radius, underline, and the type scale are unchanged. Brand mark and title are unchanged; the brand group still uses `--tc-space-header` (8px, 4px from 1180px down).
  - Pill ends and the minimum gap between the four groups are `--tc-space-4` (16px), inside the 14–16px range. `justify-content: space-between` still spreads leftover space equally between groups (#117).
  - Simulation pill padding is 8px 18px (`--tc-space-2` and `--tc-sim-pad-inline`). Nav tabs are 8px 14px with 26px between them. Scheme segments are 7px 14px inside a 2px track inset. The `?` control is a 34px circle, 10px from the toggle. Those lengths are shared tokens so tellr / pnc / mtb / fnb stay the same size.
  - Header group gap is owned by CSS, not an inline style, so a `max-width: 840px` rule can drop it to `--tc-space-2` (8px). That keeps the `?` 16px off the right edge once the simulation pill has shrunk. Scheme collapse still measures each group's own gap (#113).
  - The help control is the one header target under 48px. `a11y.test.tsx` expects 34px for that button only.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/128. Do not merge. Headless Chrome at 1x, no screenshots. At 1280 the four banks match: ends 16px, equal group gaps, badge `8px 18px`, tabs `8px 14px` / 26px, scheme inset 2px and segment `7px 14px`, help 34px with a 10px gap and 16px of right padding. 1024 and 800 keep that padding and do not clip tab labels. Below about 780px the full tab row no longer fits inside 16px ends. Do not merge. No contract, engine, library, or golden edits.
