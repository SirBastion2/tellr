# Handoff

### [B] Remove the read-aloud script card — Agent B1 — 2026-10-25 09:01
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

- **Changed:** `web/src/workstation/CopilotStrip.tsx`, `web/src/index.css`, `web/src/copilotCard.test.tsx`, `web/src/copilotScroll.test.tsx`, `web/src/workstation.test.tsx`, `web/src/workstationMerge.test.tsx`, `web/src/themeCycle.test.tsx`, `docs/handoff/20261025-0901-remove-read-aloud-script.md`
- **Decisions I made, and the section that justified each:**
  - Stopped rendering the Read-aloud script `details` card. `suggestedAction()` is unchanged, including the `talk_track.lines[0]` fallback when `talk_track.action` is missing (CHANGE-007). `talk_track.lines` still arrives on `SessionState`; the panel no longer joins or shows it. Task card is web presentation only. Did not edit `ARCHITECTURE.md` or `docs/HANDOFF.md`.
  - Removed the index.css rules that only styled that card, including the unused `.tc-quote` selector. Quote theme tokens (`--tc-quote-*`) stay: `web/src/copilotTheme.test.tsx` still asserts them, and no component reads them now.
  - Did not touch signal-row markup. Merged `origin/main` (`#135` stacks the origin badge under the signal text; `#133` adds the root README).
  - The strip body is one grid. With the card gone, Suggested action’s next sibling is the signal list. No empty child. Checked tellr, pnc, mtb, and fnb in light and dark. No screenshots.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/136. No contract, engine, library, golden, mock, or `feed.ts` edits. No new dependency. Root `ARCHITECTURE.md`, `docs/UI_REFERENCE.md`, `README.md`, and older handoff notes still describe the read-aloud card as visible. Tests that mention it now expect the card to be absent.
