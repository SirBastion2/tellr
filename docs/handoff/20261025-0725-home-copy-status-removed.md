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
  - Removed the whole Home status paragraph under the Workstation heading (`Library` version and `Copy status`, including `data-testid="copy-status"`). The heading stays. Architecture workstation section: Home renders server state and does not add display copy. `library.library_version` and `library.copy_status` stay on the library type and API payload. Technical details are untouched.
  - Dropped the empty `tc-stack-heading` wrapper that existed to stack that line under the heading. The Workstation `h2` is a direct child of `.tc-screen`, so the toolbar is the next element and the gap is the shared `--tc-space-body-control` token (`DENSITY.spaceBodyControl`, 12px). No new element. Other screen gaps stay on that same token. Headless Chrome: heading-to-toolbar and toolbar-to-workstation are both 12px on tellr, pnc, mtb, and fnb, in light and dark. No screenshots.
  - `web/src/home.test.tsx` no longer expects the copy-status line. It checks the Workstation heading, the simulated customer controls, and that the heading-to-toolbar gap is that shared token on all four themes.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/121. Do not merge. No contract, engine, library, or golden edits. No new dependency. `docs/HANDOFF.md` was not edited. `ARCHITECTURE.md` was not edited (no files moved; `docs/handoff/` is already on the map). Web does not compute risk, levels, reasons, or the next question.
