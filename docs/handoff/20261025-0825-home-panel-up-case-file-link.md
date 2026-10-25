# Handoff

### [B] Home panel up, case-file link — Agent B1 — 2026-10-25 08:25
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

- **Changed:** `web/src/screens/HomeScreen.tsx`, `web/src/workstation/Toolbar.tsx`, `web/src/workstation/TransactionPanel.tsx`, `web/src/index.css`, `web/src/home.test.tsx`, `docs/handoff/20261025-0825-home-panel-up-case-file-link.md`
- **Decisions I made, and the section that justified each:**
  - Home body is one `.tc-workstation` grid. The left cell (`.tc-home-column`) is the simulated-customer controls plus the Transaction block, with the existing `--tc-space-body-control` gap between them. The copilot is the other cell, so its top edge shares that grid top (16px under the header via `.tc-shell`). Column tracks, the workstation gap, and the stack below 900px are the existing `.tc-workstation` rules. Why this level stays a full-width sibling under the grid.
  - Removed `.tc-transaction` `padding-top` from #129. That offset lined the heading up with the badge when the panel started below the toolbar. The panel now starts at the label, so the offset is gone.
  - One case-file control (`CaseFileLink`) sits in `.tc-txn-head` with the Transaction heading, right-aligned by its existing `marginLeft: auto`. Same button styles, labels, and `onToggleCase`. It is not in the toolbar.
  - `web/src/App.tsx`, the contract, weights, and golden tests were not edited. `web/` still does not compute risk, level, reasons, or the next question.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/130. The left column is `.tc-home-column` inside `.tc-workstation`. Do not put the case-file link back on the toolbar, and do not restore `.tc-transaction` padding-top.
