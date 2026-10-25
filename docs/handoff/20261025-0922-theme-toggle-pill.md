# Handoff

### [B] Theme toggle selected segment is a pill — Agent B1 — 2026-10-25 09:22
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS

```
── typecheck
── lint
── test
 Test Files  55 passed (55)
      Tests  198 passed (198)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/index.css`, `web/src/scheme.test.tsx`, `web/src/headerRhythm.test.tsx`, `docs/A_TO_B.md`, `docs/handoff/20261025-0922-theme-toggle-pill.md`
- **Decisions I made, and the section that justified each:**
  - The Light / Dark / System buttons keep an inline radius of 0 (`App.tsx` was left untouched). One block in `index.css` sets the shared pill token `--tc-radius-control` (999px) on the selected segment, and on every scheme segment so the first and last are the same bubble. The track padding is `--tc-space-1` (4px) on all sides, and the scheme track is `overflow: visible` so that inset pill is not clipped square. Architecture header section: shared pill radius, no per-bank radius. Colors, labels, focus-ring rules, and click behavior are unchanged.
  - The 1× / 2× / 4× control shares `.tc-segment`. Its selected segment uses the same pill token. Unselected speed segments stay square. The speed track keeps its existing `overflow: hidden` and 48px box.
  - `headerRhythm` now expects the scheme track padding token `--tc-space-1`. `--tc-scheme-inset` stays defined at 2px and is no longer the track padding.
- **Questions logged:** none
- **The next agent needs to know:** Do not merge until review. No contract, engine, library, golden, `App.tsx`, demo, or mock edits. No new dependency. Vitest does not inject `index.css` into jsdom, so the new test applies the segment rules itself and checks the computed radius token. Other agents may still be editing `index.css` and the toolbar; this change is the `.tc-segment` / `.tc-scheme-full` block only.
