### Answer signal rows — Agent B — 2026-10-25 09:33
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS
  ```
  ── contract
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

  GATE PASS (b)
  ```
  203 web tests passed.
- **Changed:** `web/src/answerSignals.ts`, `web/src/answerSignals.test.tsx`, `web/src/workstation/CopilotStrip.tsx` (row list only), `web/src/mockReplay.test.ts`, `web/mock/live_answers.json`, `scripts/gen_live_answers.py`, `ARCHITECTURE.md`, `docs/UI_REFERENCE.md`, this file. Did not edit `docs/HANDOFF.md`, `index.css`, panel height, overflow, `contract/`, `reference_impl.py`, or golden weights.
- **Decisions I made, and the section that justified each:**
  - The live API already returns the full effective evidence on `explanation.contributions` (`api/main.py` `attach_explanation`, CHANGE-005). `risk.reasons` stays capped at 3 (architecture §6.5). The copilot renders that contribution list. It does not score.
  - Demo climb rows in `web/mock/live_answers.json` were `public_state` only, so they omitted `explanation`. `scripts/gen_live_answers.py` now writes `engine.score.contributions` onto those climb keys when the rest of the body matches. Ten keys updated. Other recorded keys were left as they were.
  - Keep/suppress is a fixed decision per answer-asserted signal id, compared with context-chip labels in `library/chips.yaml` / `contract/library.json`. Kept rows use the contribution label and the badge "From the customer's answer". They have no confirm, dismiss, or restore. Chip rows are unchanged.
  - `sig.answer_relayed` keep. "Answer relayed by caller" is not the phone chip or the directing chip.
  - `sig.specificity_gap` keep. "Missing details" is not on a context chip.
  - `sig.story_drift` keep. "Story changed" is not on a context chip.
  - `mit.purpose_specific` keep. "Clear purpose" is not on a context chip.
  - `mit.named_counterparty` keep. "Named the payee" is not on a context chip.
  - `mit.written_estimate` keep. "Written estimate exists" is not on a context chip.
  - `mit.own_named_account` keep. "Account in their own name" is not on a context chip.
  - `mit.accepts_alternative` keep. "Accepted a cashier's check" is the opposite of "Insists on cash".
  - `sig.secrecy_bank` suppress. "Told not to discuss with the bank" restates "Mentions urgency, secrecy, or being told what to say".
  - `sig.cash_refusal_unexplained` suppress. "Turned down a safer option" restates "Insists on cash".
- **Questions logged:** none
- **The next agent needs to know:**
  - Answer rows appear only when the response includes `explanation.contributions`. Context-only recordings and the older non-climb answer keys still omit it, so they add no answer rows.
  - The signal list markup is unchanged aside from the extra `<li>` rows. Another change owns panel height and overflow.
