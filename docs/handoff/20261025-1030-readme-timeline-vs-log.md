### README timeline vs saved log — 2026-10-25 10:30
- **Status:** done
- **Gate:** `scripts/gate.sh a` → PASS

```
216 passed, 1 warning in 24.23s
Contracts: 1 kept, 0 broken.
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (a)
```
- **Changed:** `README.md` (two sentences in "The demo vs real use"), `docs/A_TO_B.md` (M-032), this file. Did not edit `docs/HANDOFF.md`, `web/`, `engine/`, `contract/`, `reference_impl.py`, golden tests, or weights.
- **Decisions I made, and the section that justified each:**
  - Timeline: `web/src/workstation/TransactionPanel.tsx` renders the Timeline from `customer.events` and stamps each row with `timelineElapsedMs` / `formatElapsed` in `web/src/demo/clock.ts` (sum of `delayMs`, simulated scene time). `web/src/screens/HomeScreen.tsx` mounts that panel only when a demo customer is set. The shipped page always loads a simulated customer, so the sentence says a real teller on a visit with no simulated customer would not see it, which matches that mount. Architecture §14.1: a live visit has no scenario.
  - Saved log: `store/sqlite.py` `events` is append-only (`events_no_update`). `api/main.py` writes `ContextAdded` (chip ids), `AnswerRecorded` (question id and chip id), and `OutcomeRecorded`, each with `ts`. Session id is a uuid; `account_ref` is inserted null. No customer transcript. A typed note can still be stored when sent; this demo does not send one (`README` "What goes in"). `purge` can delete closed sessions past a retention window, and the API does not call it, so the README says we save the log and do not rewrite it. It does not say the log is permanent.
  - History: `web/src/screens/HistoryScreen.tsx` lists session id, mode, opened, closed, and library version from `GET /sessions`. It does not render chips, answers, or outcomes. The requested line "reviewed on the History screen" would have been wrong for the tap log, so the sentence says History lists the visits and does not show the taps. `web/src/presenter.tsx` keeps History off the demo nav; that fact is in M-032, not in the two README sentences.
- **Questions logged:** none
- **The next agent needs to know:** Do not call the Timeline the audit log, and do not say History shows each tap. `scripts/gate.sh a` does not read `README.md`.
