# Handoff

### [B] Teller decision selected state — Agent B1 — 2026-10-25 09:42
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

- **Changed:** `web/src/screens/OutcomeScreen.tsx`, `web/src/App.tsx`, `web/src/outcome.test.tsx`, `docs/UI_REFERENCE.md`, `docs/handoff/20261025-0942-decision-selected-state.md`
- **Decisions I made, and the section that justified each:**
  - Selected paint uses the active bank's `button` / `buttonText` pair (the same tokens as a primary control) plus the existing check icon, `aria-pressed`, and the shared `999px` pill radius. The copilot recommendation stays `highlightBg` / `highlightFg` with the text "Copilot's recommendation" (`title` and a `tc-text-xs` label) until that button is the teller's choice; then the filled selected treatment wins and the label stays. Same component for tellr, pnc, mtb, and fnb. Architecture §11.2 and §12: the suggestion only chooses the highlight; all four outcomes stay enabled. UI reference outcome row.
  - The selected id is `recorded.outcome`, then `GET /handoff` `outcome` (`AppShell` already loads that projection), then the local click. A posted outcome is not replaced by a later click. `POST /sessions/{id}/outcome` already records the decision (`contract/api.md`); no new endpoint. SessionState still has no `outcome` field. After a successful post the visit closes and the choice buttons stay hidden, as before.
  - Enter and Space on a choice button select it. No new global shortcut. `E` still escalates through the existing confirm.
  - Helper copy is now "All four choices stay available. The one marked is the copilot's recommendation; you decide." The old sentence only described the suggestion highlight.
  - Did not edit `CopilotStrip.tsx`, `index.css`, `HandoffScreen.tsx`, the contract, the engine, or the API. Did not edit `docs/HANDOFF.md` or `ARCHITECTURE.md`. No new dependency.
- **Questions logged:** none
- **The next agent needs to know:** The decision block is `OutcomeScreen`, not the Handoff fact row. `recordedOutcome` is the handoff projection's `outcome`. A choice that is both selected and recommended shows the filled check treatment and still carries "Copilot's recommendation". Report is never that label. `docs/architecture.md` §12 still describes the suggestion as the highlight only; that remains true for the unselected recommendation.
