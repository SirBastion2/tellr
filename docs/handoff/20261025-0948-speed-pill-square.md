# Handoff

### [B] Speed segment square layer and scheme track fill — Agent B1 — 2026-10-25 09:48
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS

```
── typecheck
── lint
── test
 Test Files  55 passed (55)
      Tests  200 passed (200)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/index.css`, `web/src/workstation/Toolbar.tsx`, `web/src/App.tsx`, `web/src/scheme.test.tsx`, `docs/handoff/20261025-0948-speed-pill-square.md`
- **Decisions I made, and the section that justified each:**
  - Architecture header / toolbar: controls share `--tc-radius-control` (999px). PR #140 rounded the selected speed segment and every scheme segment, but the speed buttons still carried a square inline radius and the native button face, so a square layer stayed visible beside the bubble (most clearly on the right edge of 1×). The segment rule now sets that pill radius on the button, `:hover`, `:focus`, `:focus-visible`, `:active`, and both pressed states, and on `::before` / `::after`. `appearance: none` drops the native square face. The speed track keeps a 4px `--tc-space-1` inset on every side, and the speed buttons stretch inside that box so the bubble is not clipped into a square shoulder. Labels, button colors, and the 1px press shift are unchanged.
  - The Light / Dark / System track was transparent, so unselected options read as separate pills on the page. Both tracks now fill with `--tc-secondary-bg` (the black already used by unselected segments in dark, and the same token in light). The existing `--tc-secondary-border` outline stays. No new color. tellr, pnc, mtb, and fnb share the rule; there is no per-bank radius.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/150. Do not merge until review. The scheme track stays `overflow: visible` so its focus ring is not clipped; the speed track stays `overflow: hidden` and the ring still paints in the inset. Vitest does not resolve the track `background` custom property, so the test locks the token in `index.css` and checks the computed radius. No contract, engine, library, or golden edits. No new dependency.
