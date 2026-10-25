# Handoff

### [B] File timer still fires scripted events — Agent B1 — 2026-10-25 07:43
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS (typecheck, lint, 192 tests, contract OK)

```
── typecheck
── lint
── test
 Test Files  53 passed (53)
      Tests  192 passed (192)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/App.tsx`, `web/src/demoPolish.test.tsx`, `docs/handoff/20261025-0743-timer-events-fix.md`
- **Decisions I made, and the section that justified each:**
  - Scripted events arm from the same elapsed clock as the toolbar timer (`web/src/demo/clock.ts` simulated sum of `delayMs`). The #119 interval still runs for the life of play, is not cleared on step index or route changes, and still caps at the full script. A beat fires when elapsed time reaches that beat's timestamp. Speed changes wall time only.
  - Clock renders no longer copy `index` backward onto the event cursor. A rewind repeated the beat already on screen and did not arm the next one.
  - Step still snaps the clock forward to the beat boundary when it is behind. It does not move the clock backward. Pause, restart, and the end of the script stop the clock. Reduced motion still uses a 0 wait.
  - No new controls. `web/` still does not compute risk, level, reasons, or the next question.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/127. Fake-timer regression in `web/src/demoPolish.test.tsx` plays contractor cash from Home through three beats (0:04, then 2×, then 0:18 and 0:32). It does not open Customer file. The displayed timer stays monotonic and holds on pause. No contract, engine, library, or golden edits. No new dependency. `docs/HANDOFF.md` was not edited. Merged `origin/main` through #121 and #123.
