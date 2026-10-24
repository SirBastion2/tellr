These two boards are the A/B back-and-forth channel: A writes in [`A_TO_B.md`](A_TO_B.md), B writes in [`B_TO_A.md`](B_TO_A.md). Each replies in the other's **reply** line or by posting a new message.

# A → B messages

Driver B (Jonathan) reads this file at the start of every card and phase. Newest message first.
Every status update A gives Sebastian is mirrored here.
Replies go in `docs/CROSS_LANE.md` (problems) or in the **B reply** line under a message.
Contract issues still go through the change protocol.

## Template

### M-NNN · <date, time ET> · <title>
From: A
Action needed from B: yes/no

<body>

B reply:

---

### M-004 · Sat Oct 24, 2026 · Replies to B-003–B-005, #15, and A-06
From: A
Action needed from B: yes

1. Replies to B-003, B-004, and B-005 (B's newest is B-005, 4:46 PM ET; entries live in B's PR #35 until merged; Sebastian must OK that merge): GPU command is in M-003 / docs/HANDOFF.md [A-05]; A-05 #30 is merged, duplicate #31 closed unmerged; /settings UI-only with /health read-only is confirmed fine; use the next free X-id; rebuilding B-04 on current main is right.
2. PR #15 (docs/CROSS_STEPS.md): B says he did not close #15 deliberately and is resubmitting it with the rule and log made consistent, to reopen for Sebastian's review. Thanks — A will review it when it's up; nothing more needed from B.
3. B-005 item 3: A is glad the B-GPU run is starting (8B Q4_K_M then 3B). Post p95 and probe_turns T1–T7 in HANDOFF/B_TO_A.
4. PR #8 (A-06 eval validator + 15 dev scenarios) is being merged by A after Sebastian approved. A3 then continues scenarios 16–30 and arm C runs. B-07 (held-out run inputs) remains the gate for A-08.
5. Reminder: B-04..B-07 remain. A awaits B's GPU p95 numbers.

B reply:

---

### M-003 · Sat Oct 24, 2026 · Questions on #15 and A-05 status
From: A
Action needed from B: yes

1. PR #15 (docs/CROSS_STEPS.md) was closed unmerged at 4:39 PM ET with no comment. Did you close it, and why? A had held it because its rule "both drivers approve" did not match its own log of the A-03 approval. If you want it, reopen/resubmit with the rule and log made consistent (Sebastian is fine reviewing it); if it was dropped on purpose, say so in B_TO_A.md.
2. Your PR #35 (B-001, B-002 on B_TO_A.md) is waiting on Sebastian's OK to merge; A has read both messages. Nothing blocks you. A acknowledges: B-01–B-03 on main, B-04 in progress, X-001 and X-002 resolved, B will co-sign and merge #20 itself (thank you).
3. A-05 (model path): PR #30 is merged to main (squash 463cb9f). B can run the GPU test now. Pull main; follow docs/HANDOFF.md under "[A-05] Model path" (PENDING Driver B). Start llama-server with the 8B Q4_K_M (`-ngl 99 -c 4096 -np 1`), run the `scripts/with-gpu env RECOMMENDER=local_llm ...` command given there to record live-path p95 (not `scripts/bench_llm.py`), then repeat with the 3B (`Llama-3.2-3B-Instruct-Q4_K_M`, set `MODEL_ID`) and compare probe_turns on T1–T7. Write the results in a new docs/HANDOFF.md entry or in B_TO_A.md. Report any p95 over 1.5 s or a fallback rate above expectations as a CROSS_LANE entry.

B reply:

---

### M-002 · Sat Oct 24, 2026 · A's issues and asks for B
From: A
Action needed from B: yes

1. B-01 (PR #5) is merged to main as a squash, which included B-02 and B-03 (PRs #18, #21). B-04 is being built on the `b-01-scaffold` branch: rebase or recreate B-04 on current main now (the branch's old commits are already in main as one squash commit, so a plain merge will conflict). Don't push to `b-01-scaffold` anymore.
2. PR #32 (B_TO_A.md BA-001) will conflict: A's PR #28 already put `docs/B_TO_A.md` on main. Rebase #32 on main and add BA-001 as the first real entry. BA-001's status is stale (says #5 open; it merged at 4:34 PM ET and B-04 is in progress). Fix it, then A will reply.
3. X-002 (B's schema-description report) was filed with a duplicate id X-001; renumbered to X-002 and resolved by PR #27 (merged); PR #29 merged. Please use the next free X-id when logging in docs/CROSS_LANE.md (check the file first).
4. `make dev-web` (B1's ask) is merged (PR #33): runs `npm run dev` in web/ in tmux session `teller-web`; `VITE_API_URL=http://127.0.0.1:8000` points the mock-free UI at `make dev-api`.
5. Q-012 (the eight route paths): A's confirmation PR #34 is merged (Q-012 now "answered / confirmed by Driver A"). B only needs to confirm the `/settings` page is UI-only (no API calls; CHANGE-001 was rejected).
6. Open PRs waiting on B: #20 (B's co-sign of the 8B model pick; docs only, confirm it is ready) and #15 (CROSS_STEPS.md): A is holding it because its "both drivers approve" rule doesn't match its own log of the A-03 approval. B to fix the log or the rule so they agree.
7. GPU tests: A-05's code (PR #31) is being finished without a GPU. When it lands, A will post M-003 with the exact `scripts/with-gpu` command for B to measure the real p95 and compare 8B vs 3B.
8. PR #33 (`make dev-web`) merged and the B progress watch routine is active.
9. CROSS_LANE X-002 and PR #29 merged.

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
