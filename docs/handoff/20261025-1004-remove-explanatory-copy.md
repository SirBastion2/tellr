# Handoff

### [B] Remove explanatory teller copy — Agent B1 — 2026-10-25 10:04 UTC
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS (typecheck, lint, 212 tests, contract OK)

```
── typecheck
── lint
── test
 Test Files  57 passed (57)
      Tests  212 passed (212)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/screens/ContextScreen.tsx`, `web/src/screens/HealthScreen.tsx`, `web/src/screens/HistoryScreen.tsx`, `web/src/workstation/ExplanationPanel.tsx`, `web/src/ui/ConfirmDialog.tsx`, `web/src/App.tsx`, `web/src/change005.test.tsx`, `web/src/emptyRoutes.test.tsx`, `web/src/health.test.tsx`, `web/src/history.test.tsx`, `web/src/routes.test.tsx`, `web/src/workstation.test.tsx`, `docs/UI_REFERENCE.md`, `docs/A_TO_B.md` (M-028), `docs/handoff/20261025-1004-remove-explanatory-copy.md`
- **Decisions I made, and the section that justified each:**
  - Removed teller-visible sentences that explain scoring, the engine, missing API fields, or what a control does behind the scenes (task; architecture §12: the screen renders server state and does not compute risk). Did not add UI. Did not edit `web/src/ui/ShortcutHelp.tsx` or its strings. Did not edit `docs/HANDOFF.md`, `ARCHITECTURE.md`, `engine/`, `api/`, `contract/`, `reference_impl.py`, golden tests, or weights.
  - History still requires `library_version` on the payload so a bad row stays invalid. The row is not shown.
  - Confirm dialogs keep their titles and buttons. The body is omitted when there is no sentence, and `aria-describedby` is omitted with it.
  - `docs/UI_REFERENCE.md` was updated only where it quoted removed text.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/154. Shortcut help still contains “These keys work on every screen, including Outcome and Handoff. They do nothing while you type in a field, or while Ctrl, Alt, or Cmd is held.” That file was left alone. No new dependency. `web/` still does not compute risk, levels, reasons, or the next question.

## Strings removed

- `This screen does not score the visit.` (Context). Kept `Add what you see at the window.`
- `The decision engine follows the setup from startup. This screen does not change it.` (Health)
- History fact label `Library version` and the version value
- ` (before display rules)` on the raw-level label. The label is now `Raw level`
- `Decided by: not included.`
- `Response time: not included.`
- `Rejected tries: not included.`
- ` That is the whole service, not this decision.`
- `Service-wide rates are not loaded.`
- `This decision used the fallback.`
- `This decision did not use the fallback.`
- `This response lists no contributions.`
- `Per-signal weights, a confidence value, and a per-decision fallback flag are not in this response.`
- `This records an escalate outcome for the teller and opens the handoff.`
- `This resets the live session and the simulated timeline.`

## Kept, unsure

- `Not applicable (rules engine).` Null confidence. Architecture and `change005` require this sentence. It names the rules engine.
- `Decided by: …` when debug is present, including `rules engine`, `on-device model`, `hosted model`, and `practice stand-in`. Health fact label `Decision engine`.
- `Across recent visits, agreement with the rules is … and the fallback rate is ….`, including `not included` when agreement is null. Health labels `Fallback rate`, `Rejections`, and `Agreement with the rules`.
- `Raw level` when it differs from the shown level.
- `Model confidence: N.`
- Technical-details weight lines (`Weight N` plus the `sig.*` / `chip.*` id). Architecture and tests keep ids and weights in that collapsed panel.
- Level cutoff rows such as `Clear: 0–N`.
- Dev-only schema banner `Contract mismatch` and the schema path (`import.meta.env.DEV`).
- `This screen needs an open visit. Open Home and start a customer.`
- `That address is not a screen in Teller Copilot. Start a customer from Home.`
- `A live visit cannot load a practice scenario.`
- `LIVE — no scenario loaded`
- Key names on control titles, not in shortcut help: `Confirm signal (C)`, `Dismiss signal (D)`, `Escalate to supervisor (E)`, `Play (P)`, `Pause (P)`, `Step (N)`, `Restart (R)`, `Keyboard shortcuts (?)`. Nav hint title `Available after a visit starts`.
- Outcome copy kept on instruction: `Copilot's recommendation` and `All four choices stay available. The one marked is the copilot's recommendation; you decide.`
