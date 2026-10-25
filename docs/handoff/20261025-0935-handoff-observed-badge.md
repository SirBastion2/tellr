### [B] Handoff Observed badge for answer reasons — Agent B1 — 2026-10-25 09:35
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS

```
── typecheck
── lint
── test
 Test Files  55 passed (55)
      Tests  198 passed (198)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/feed.ts`, `web/src/screens/HandoffScreen.tsx`, `web/src/feed.test.ts`, `web/src/handoff.test.tsx`, this file
- **Decisions I made, and the section that justified each:**
  - Handoff "Why it was flagged" (`web/src/screens/HandoffScreen.tsx`, architecture workstation section) applies `handoffReasonBadge` to each `flaggedSignals` row. A null origin, which `factorOrigin` returns when no context chip matches a recorded answer, displays as Observed. Teller confirmed stays on chips the teller confirmed. Dismissed stays Dismissed. This chooses a badge label. It does not compute reasons (architecture §9 / §12).
  - `factorOrigin` is unchanged, so the explanation overlay still hides Observed (`ExplanationPanel` `raisedOrigin`). The copilot panel still hides Observed on signal rows. `CopilotStrip.tsx` and `index.css` were left untouched.
  - `InterviewScreen` lists `session.risk.reasons` under the same heading and does not render origin badges or `flaggedSignals`. Left as-is.
- **Questions logged:** none
- **The next agent needs to know:** PR https://github.com/SirBastion2/tellr/pull/142. No screenshots. No contract, engine, library, or golden edits.
