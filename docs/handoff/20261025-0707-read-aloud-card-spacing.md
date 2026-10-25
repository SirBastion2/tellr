# Handoff

### [B] Read-aloud script card spacing — Agent B1 — 2026-10-25 07:07
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS (typecheck, lint, 195 tests, contract OK)

```
── typecheck
── lint
── test
 Test Files  53 passed (53)
      Tests  195 passed (195)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/index.css`, `web/src/workstation/CopilotStrip.tsx`, `web/src/copilotScroll.test.tsx`, `docs/handoff/20261025-0707-read-aloud-card-spacing.md`
- **Decisions I made, and the section that justified each:**
  - Quote card padding is `--tc-space-4` (16px) on all four sides. The selector beats `.tc-block`’s top-only padding so the colored card stays even (shared spacing scale in `web/src/theme/tokens.ts`; architecture workstation section).
  - Tag-to-script gap is `--tc-space-2` (8px). The 48px summary row is gone. Script margin is 0. `text-box-trim` drops half-leading at the ends so the line box does not pad the bottom. Font size, weight, color, and copy are unchanged.
  - The card stays `height: auto` with `overflow: visible`. Headless Chrome: padding 16px and gap 8px on tellr, pnc, mtb, and fnb; a longer script grows the card and `scrollHeight` equals `clientHeight`. No screenshots.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/118. Do not merge. No contract / engine / library / golden edits. No new dependency. No screenshots or videos. This entry was moved out of `docs/HANDOFF.md` when merging `origin/main`: that file is a pointer and stays untouched. Web spacing changes are unchanged.
