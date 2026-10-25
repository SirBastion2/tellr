# Handoff

### [B] Capitalize the stop reason — Agent B1 — 2026-10-25 09:36
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

- **Changed:** `web/src/ui/plain.ts`, `web/src/screens/HandoffScreen.tsx`, `web/src/handoff.test.tsx`, `docs/handoff/20261025-0936-capitalize-stop-reason.md`
- **Decisions I made, and the section that justified each:**
  - The Stop fact on Handoff is the only row labelled Stop (`web/src/screens/HandoffScreen.tsx`). `stopReasonLabel` in `web/src/ui/plain.ts` uppercases the first character at render time. The rest of the engine phrase stays as sent, including a trailing `; nothing left to ask`. `data-kind` is still the engine kind. No engine, API, `contract/`, or mock edit. Architecture §12: the screen renders server state and does not recompute it.
  - The same fact grid already sends mode, level, pattern, outcome, and actor through presentation helpers. Nothing else in that grid prints a raw stop reason, so the helper is only called for the Stop value.
  - Session’s hard-stop paragraph still prints `session.stop.reason` as sent (`web/src/screens/InterviewScreen.tsx`). That line is not the Stop row. Its `data-reason` stays the engine string. The recommended-stop sentence is unchanged.
  - Adjusted the existing Handoff fixture test. T1’s hard stop remains `enough to proceed; nothing left to ask` on the projection and renders as `Enough to proceed; nothing left to ask`. No new dependency. Did not edit `ARCHITECTURE.md` or `docs/HANDOFF.md`.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/145. `stopReasonLabel('enough to escalate; nothing left to ask')` is `Enough to escalate; nothing left to ask`. The same helper is the place to use if Session’s hard-stop text should match. Playwright was installed only in this environment so the existing fact-grid measurement could run; it is not a project dependency.
