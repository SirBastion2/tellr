### [sandbox] Handoff glass card — Agent B — 2026-10-25 16:33
- **Status:** done
- **Gate:** `scripts/gate.sh a` → PASS
  ```
  216 passed, 1 warning in 24.71s
  Contracts: 1 kept, 0 broken.
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (a)
  ```
  `scripts/gate.sh b` → PASS
  ```
  Test Files  59 passed (59)
  Tests  232 passed (232)
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (b)
  ```
  `scripts/gate.sh contract` → PASS
  ```
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (contract)
  ```
- **Changed:** `web/src/screens/HandoffScreen.tsx`, `web/src/index.css` (Handoff block only; the shared non-home stage rule is unchanged), `web/src/handoff.test.tsx`, this file
- **Decisions I made, and the section that justified each:**
  - The card is positioned only by `.tc-stage .tc-shell > main > .tc-handoff.tc-screen`: x 193–818, y 114–515, radius 45, in the stage `--u` unit. The shared `.tc-screen:not(.tc-home)` slot is untouched, so Home and Outcome keep their boxes. Header, divider (y 211), and body use the same unit. The body is the only scrollport (`overflow: auto`, `min-height: 0`). The card box does not grow.
  - The heading is the word Handoff. The case id beside it is `shortId(session_id)` (the real id, full id on the tooltip). Copy to clipboard still writes that session id. There was no save/download on this screen; the floppy button downloads a text file of the on-screen summary and is labeled “Save handoff”.
  - The left column lists each existing handoff field once (Mode, Questions answered, Level with icon and word, Urgency Score, Pattern, Stated purpose, Suggested outcome, Teller’s decision, Recorded by, Stop when the server sent one). The image’s repeated Type / Amount / Memo block is a placeholder, not transaction data. The counterpoint stays under Why it was flagged. The composed title “Handoff — Escalated by …” is not the heading; the decision and actor remain in the rows.
  - Flagged chips use accent-tinted pills and wrap. `handoffReasonBadge` is unchanged: not teller-confirmed shows Observed, confirmed shows Teller confirmed, dismissed stays Dismissed. The badge is the next line inside the chip. No signal or chip id is shown.
  - Colors are theme tokens (`--tc-glass-*`, `--tc-text`, `--tc-highlight`, `--tc-accent`, `--tc-risk-*`). The card ends at y 515. The shared footer band starts at y 520. Handoff does not select, position, or align the credit, so the shared centered footer applies. `web/` does not compute risk, level, reasons, or the next question (architecture §9, §12).
- **Questions logged:** none
- **The next agent needs to know:** Draft PR against `sandbox/home-redesign-exact`. Do not merge to main. Do not edit the shared footer from this branch. The summary is taller than the six placeholder rows, so the body scrolls. `fixture-T1` is shown as stored, not as “Fixture-T1”.
