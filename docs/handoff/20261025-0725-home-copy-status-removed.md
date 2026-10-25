# Handoff

### [B] Home copy-status line removed — Agent B1 — 2026-10-25 07:25
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS (typecheck, lint, 196 tests, contract OK). Relevant test: `web/src/home.test.tsx` passed (2).

```
── typecheck
── lint
── test
 Test Files  53 passed (53)
      Tests  196 passed (196)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/screens/HomeScreen.tsx`, `web/src/home.test.tsx`, `docs/handoff/20261025-0725-home-copy-status-removed.md`
- **Decisions I made, and the section that justified each:**
  - Removed the Home status paragraph (`Library` version and `Copy status`, including `data-testid="copy-status"`) and the Workstation `h2`. Home starts at the simulated-customer toolbar. `library.library_version` and `library.copy_status` stay on the library type and API payload. Technical details are untouched. No new element.
  - The page h1 is already `Teller Copilot` in the header. Workstation was an `h2`. No accessibility test or other test required that heading, so it is not visually hidden.
  - Toolbar-to-workstation stays the shared `--tc-space-body-control` gap (12px). Home and the toolbar have no top margin or padding. Headless Chrome: toolbar top equals the Home screen top on tellr, pnc, mtb, and fnb. Card padding is unchanged. No screenshots.
  - `web/src/home.test.tsx` no longer expects the copy-status line or the Workstation heading. It checks that the toolbar is the first Home child, with no extra top margin, on all four themes.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/121. Do not merge. No contract, engine, library, or golden edits. No new dependency. `docs/HANDOFF.md` was not edited. `ARCHITECTURE.md` was not edited (no files moved; `docs/handoff/` is already on the map). Web does not compute risk, levels, reasons, or the next question.
