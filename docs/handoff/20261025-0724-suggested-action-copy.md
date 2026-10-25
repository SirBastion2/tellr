### [stop] Suggested action is the next question — 2026-10-25 07:24 UTC
- **Status:** blocked on a contract change. No product copy was edited.
- **Gate:** `scripts/gate.sh b` → PASS (`GATE PASS (b)`; typecheck, lint, 193 tests, `contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact`). First run failed only because Playwright was missing for `factGridAlign.test.tsx`; after `npx playwright install chromium` the same gate passed. No product code changed between the two runs.
- **Changed:** this file, and `docs/QUESTIONS.md` (Q-016, protocol step 1 only).
- **Decisions:** The card text is `SessionState.question.text`. That string is the engine's next question. It is not web display copy and not demo-script copy. `library/`, `contract/`, `reference_impl.py`, golden tests, frozen weights, `web/`, and `docs/HANDOFF.md` were left as they are. `ARCHITECTURE.md` was left as it is (no file moved).

## What the copilot shows

`web/src/workstation/CopilotStrip.tsx` `suggestedAction()` returns `session.question.text` whenever the server sent a question. The read-aloud card is a separate function, `readAloud()`, and it is only `session.talk_track.lines`. Root `ARCHITECTURE.md` (workstation section) and `docs/UI_REFERENCE.md` describe that split the same way. `web/src/workstation.test.tsx` asserts the card equals `question.text`.

On a hard stop, `question` is null and the same function falls through to `talk_track.lines[0]`. That line is still the spoken script.

## Field and file that produce the words

| Piece | Where |
|---|---|
| Field on the wire | `SessionState.question.text` (`contract/session_state.schema.json`, required on the question object; architecture §11.2) |
| Sentence | `library/questions.yaml` `questions[].text`. The opener is `q.purpose.open`: "What's the money for today?" |
| Projection | `engine/rules.py` `question_view()` copies `question.text` into the response. `engine/library.py` exposes the same `text` on `GET /library`. |
| Which question | `reference_impl.py` `eligible()` returns the question **id** (`q.purpose.open` until an answer is recorded). The oracle has no prose. |
| Frozen copy | `scripts/gen_fixtures.py` `QUESTION_COPY` writes `contract/library.json` and `contract/fixtures/T1.json`–`T7.json`. |
| Demo replay | `web/mock/live_levels.json` is recorded engine output. All 128 context-chip states have `question.id` `q.purpose.open` and that same opener sentence. `web/mock/live_answers.json` then returns the other five question sentences after `POST /answers`. |

`web/src/demo/customers.ts` has timeline lines and chip ids only. It has no suggested-action string. `tellr`, `pnc`, `mtb`, and `fnb` share `CopilotStrip`; no theme file has this sentence.

`question.why` is a rationale ("A neutral opener. Every customer gets this one."), not an instruction to pause, verify, offer a cashier's check, or step aside. `talk_track.lines` is the read-aloud script and stays on that card. `stop.reason` stays machine-readable (CHANGE-003).

## Current card text on every scripted demo step

Live demo posts context chips and does not post answers, so the mock serves `live_levels.json`. The suggested-action card is the opener question on every step of all five files. The four themes render that same string. Read-aloud lines are unchanged and listed so a later change can stay consistent with them.

Clear steps use `tt.proceed` ("Thanks for walking me through that."). Caution steps use `tt.slow_down` (calls / cashier's check / call back on a known number). These visits do not reach `tt.escalate`, `tt.bank_impersonation`, or `tt.home_repair` (same observation-only limit as Q-014).

| Customer | Step | Suggested action card today | Read-aloud stage |
|---|---|---|---|
| contractor-cash | window, phone, directing | What's the money for today? | `tt.proceed` |
| contractor-cash | cash, secrecy | What's the money for today? | `tt.slow_down` |
| romance-crypto | window, directing | What's the money for today? | `tt.proceed` |
| romance-crypto | cash, secrecy, unusual | What's the money for today? | `tt.slow_down` |
| government-impersonation | window, phone, directing | What's the money for today? | `tt.proceed` |
| government-impersonation | secrecy, cash | What's the money for today? | `tt.slow_down` |
| benign-car | window, purpose, amount, pace | What's the money for today? | `tt.proceed` |
| benign-routine | window, usual, chat | What's the money for today? | `tt.proceed` |

After an answer, the card follows the next question id. Those sentences are also spoken questions:

| Question id | `question.text` today |
|---|---|
| `q.purpose.open` | What's the money for today? |
| `q.homerepair.contractor_name` | Who's doing the work? I might know them. |
| `q.homerepair.estimate` | Do you have a written estimate from them? |
| `q.recipient.account_details` | Tell me about the account it's going to. Whose name is it in, and which bank? |
| `q.secrecy.told_not_to_tell` | Has anyone asked you to keep this between you and them? |
| `q.alternative.cashiers_check` | Would a cashier's check made out to them work instead? It's safer than carrying cash. |

No new suggested-action sentences were written.

## Minimal contract-change proposal (not applied)

WORKFLOW.md §5. Next id is CHANGE-007. The two post-hour-4 slots are already used (CHANGE-004, CHANGE-005). CHANGE-006 was an extra additive slot. This needs another explicit extra slot. Both drivers approve before R applies it. This note is step 1, also logged as Q-016. Do not edit `contract/CHANGES.md` until a driver writes the CHANGE.

**Add an optional string `talk_track.action`.** One imperative teller move, paired with the read-aloud track for that step. Leave `question.text` as the spoken question. Leave `talk_track.lines` and `avoid` unchanged.

Shape (optional, so old bodies still validate):

- `contract/session_state.schema.json`: `talk_track.properties.action` is a string. Leave it off `required`. `additionalProperties` stays false.
- `contract/library.schema.json`: same optional `action` on each talk track. Leave `id`, `lines`, `avoid` required.
- `library/talk_tracks.yaml`: add `action` on each existing track. `copy_status` stays the compliance-review banner. Do not edit `lines`.
- `engine/rules.py` `talk_track_for`: copy `action` onto the projected track when the library row has one.
- `scripts/gen_fixtures.py`: accept the new library key. **Omit `action` from regenerated T1–T7** until drivers ask for a fixture regen. `tests/golden/test_traces.py` and `tests/engine/test_fake_engine.py` assert exact `talk_track` equality, so emitting the key would force a golden/fixture edit.
- No `CONTRACT_VERSION` bump, no `reference_impl.py` edit, no weight edit. `reference_impl.py` does not carry talk-track prose.
- After apply, re-record `web/mock/live_levels.json` and `web/mock/live_answers.json` from the engine. Then change `suggestedAction()` to return `talk_track.action` when it is a non-empty string. Until that field is on the response, the web keeps rendering `question.text`. Inventing the imperative in `web/` would choose the teller's move on the client (architecture §12) and would diverge across fixture replay vs live API.

Draft actions for compliance review, one per existing track, matched to that track's current lines:

| Track | Draft `action` (not applied) | Current `lines` stay |
|---|---|---|
| `tt.proceed` | Complete the withdrawal. | Thanks for walking me through that. |
| `tt.slow_down` | Pause the cash. Verify the story, and offer a cashier's check. | The three slow-down lines (calls, cashier's check, call back on a known number). |
| `tt.escalate` | Ask the customer to step aside and get a manager. | I'd like my manager to take a quick look. It's routine for larger cash withdrawals. |
| `tt.bank_impersonation` | Pause the move and tell them the bank does not move money to keep it safe. | Your bank will never ask you to move money to keep it safe. |
| `tt.home_repair` | Verify the contractor and the written estimate before releasing cash. | Reputable contractors take checks and give written estimates. |

On the five demo scripts, that would show "Complete the withdrawal." on every `tt.proceed` step and "Pause the cash. Verify the story, and offer a cashier's check." on every `tt.slow_down` step, on all four themes. Those sentences are a proposal only.

**Not in this proposal:** rewriting `question.text` into imperatives (that replaces the spoken question and rewrites T1–T7, `QUESTION_COPY`, and goldens); putting the action on the question (the read-aloud script follows the level's talk track, and the demo card stays on the opener while the script moves to `tt.slow_down`); client-side copy in `web/`.
