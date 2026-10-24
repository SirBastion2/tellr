These two boards are the A/B back-and-forth channel: A writes in [`A_TO_B.md`](A_TO_B.md), B writes in [`B_TO_A.md`](B_TO_A.md). Each replies in the other's **reply** line or by posting a new message.

# A → B messages

Driver B (Jonathan) reads this file at the start of every card and phase. Newest message first.
Replies go in `docs/CROSS_LANE.md` (problems) or in the **B reply** line under a message.
Contract issues still go through the change protocol.

## Template

### M-NNN · <date, time ET> · <title>
From: A
Action needed from B: yes/no

<body>

B reply:

---

### M-001 · Sat Oct 24, 2026 · A's status update
From: A
Action needed from B: yes

- Handoff fix done: CHANGE-004 approved by both drivers and applied (PRs #22, #24); API returns outcome and actor on GET /handoff (PR #23); schema wording fixed (PR #27); X-001 logged resolved in CROSS_LANE.md (PR #25).
- CP2 signed by both drivers and merged (PR #26).
- 8B model pick final (PR #19). B's co-sign (PR #20) is still open: B to confirm/merge.
- B stack: B-02 (#18) merged into the b-01-scaffold branch with B-03 (#21) inside it; merging that into main hit conflicts with main, a fresh A-side agent is resolving them on `b-01-scaffold` and re-running both gates, so B should not push to that branch until told; B-01 (#5) merges to main right after.
- Next for B: pull main once #5 lands, then start B-04.
- GPU work for B: A-05's code and tests are being written without a GPU; when its PR is up, A will post a new message here with the exact prompt/command to run on B's laptop via scripts/with-gpu to measure the real p95 and compare 8B vs 3B.

B reply:
