### [web] Remove the Customer file screen — 2026-10-25 07:30
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS (`GATE PASS (b)`; typecheck, lint, 190 web tests, contract OK) after rebasing onto main (header spread from #117)
- **Changed:** `web/src/routes.ts`, `web/src/App.tsx`, `web/src/screens/CustomerFileScreen.tsx` (deleted), `web/src/ui/ShortcutHelp.tsx`, `web/src/ui/DemoShortcuts.tsx`, tests that named the screen or the `/customer` route, header tests that counted tabs, `ARCHITECTURE.md` (that file's line only)
- **Decisions I made, and the section that justified each:**
  - `/customer` is no longer registered. Unknown paths already use the catch-all not-found screen (`web/src/screens/NotFoundScreen.tsx`), so `/customer` falls through there.
  - No shortcut key was bound only to that screen. Help copy no longer names it. Other keys stay on the same bindings.
  - Home "Show case file" (`web/src/workstation/Toolbar.tsx`, `web/src/workstation/TransactionPanel.tsx`) stays. Header spacing from #117 stays: `justify-content: space-between`, equal `--tc-space-2` end padding, nav `flex: 0 0 auto` and centered. Remaining tabs stay content-sized (`flex: 0 0 auto`). No new spacing token and no new UI. Header tests now expect Home, Outcome, and Handoff at 1024, 1180, and 1280 for tellr, pnc, mtb, and fnb.
- **Questions logged:** none
- **The next agent needs to know:** Customer data for the demo still lives on the Home case-file panel. `web/` still does not compute risk, level, reasons, or the next question.
