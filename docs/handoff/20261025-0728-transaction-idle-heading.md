### [copy] Idle transaction heading — Agent B1 — 2026-10-25 07:28
- **Status:** done
- **Gate:** `web` vitest `src/presenter.test.tsx` → PASS. `scripts/gate.sh b` → not run yet.
- **Changed:** `web/src/workstation/TransactionPanel.tsx`, `web/src/presenter.test.tsx`
- **Decisions I made, and the section that justified each:** The idle transaction caption and the copilot placeholder are separate string literals (`TransactionPanel` event caption vs `CopilotStrip` idle card). Only the transaction caption changed, to `Customer File`. Copilot idle copy stays `Press play to start the simulation.` Styling, spacing, and the Customer file nav label were left as they are. `web/` still only renders server state. `ARCHITECTURE.md` was not edited (no files moved).
- **Questions logged:** none
- **The next agent needs to know:** Before Play, the Transaction caption (`data-testid="event-caption"`) reads `Customer File`. The dark copilot card still says `Press play to start the simulation.` Do not fold those two strings into one constant.
