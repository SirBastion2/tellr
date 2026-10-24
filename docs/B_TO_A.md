These two boards are the A/B back-and-forth channel: A writes in [`A_TO_B.md`](A_TO_B.md), B writes in [`B_TO_A.md`](B_TO_A.md). Each replies in the other's **reply** line or by posting a new message.

# B → A messages

Driver A (Sebastian) reads this file at the start of every card and phase. Newest message first.
Replies go in `docs/CROSS_LANE.md` (problems) or in the **A reply** line under a message.
Contract issues still go through the change protocol.

## Template

### B-NNN · <date, time ET> · <title>
From: B
Action needed from A: yes/no

<body>

A reply:

---

### B-006 · Sat Oct 24, 2026, 4:49 PM ET · A-05 GPU results + PR #20 merged
From: B
Action needed from A: yes

PR #20 (Driver B co-sign of 8B pick) merged 4:47 PM ET.

Ran on Driver B laptop (RTX 5070 8GB), main @6890808, llama-server -ngl 99 -c 4096 -np 1, RECOMMENDER=local_llm, MODEL_TIMEOUT_MS=1500, T1-T7 each fixture fresh app+sqlite, /health stats (few calls per fixture, small sample). rejection_count 0 everywhere.

Live-path p50/p95 ms:

| Run | T2 | T1 | T3 | T4 | T5 | T6 | T7 | fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8B run1 | 1504/1504 | 1175.5/1477.45 | 582/604.5 | 566/566 | 528/528 | 626/658.4 | 686.5/706.75 | T2 1.0, T1 0.5, else 0 |
| 8B run2 warm | 618/618 | 610/644.2 | 607.5/670.05 | 792/792 | 614/614 | 592/630.7 | 649/697.6 | 0 |
| 3B run1 | 295/295 | 201/221.7 | 215.5/230.35 | 189/189 | 210/210 | 215.5/224.05 | 208/216.1 | 0 |
| 3B run2 | 246/246 | 207.5/219.65 | 220.5/231.75 | 204/204 | 204/204 | 225/234 | 234.5/256.55 | 0 |

VRAM: 8B 7108 MiB, 3B 3781 MiB.

Questions: T2 identical both models (purpose.open, purpose.open, recipient.account_details, secrecy.told_not_to_tell, alternative.cashiers_check). Only model difference: T3 step 4, 8B q.homerepair.estimate vs 3B q.secrecy.told_not_to_tell (stable across runs). agreement_rate mostly 1.0; T1 0.5 both models; T3 0.5 for 8B.

Second independent run (same laptop, main @6890808, warm server, all T1-T7 calls pooled, n=11 model calls per model): 8B p50 663, p95 742, p99 760, min/max 622/765; 3B p50 255, p95 342, p99 364, min/max 233/370; fallback 0.0 and rejections 0 for both; agreement with rules 9/11 for both; T2 /health p50/p95 8B 691/691, 3B 278/278. In this run the models split on T3 (8B estimate vs 3B secrecy.told_not_to_tell) and T6 (8B secrecy then cashiers_check vs 3B cashiers_check twice). Live p95 is ~260 ms above A-03's bench for 8B (483) and ~46 ms above for 3B (296).

live p95 8B 742 ms, 3B 342 ms (pooled, warm); no fallbacks; cold-start first 8B call timed out once.

CROSS_LANE X-003 (for A to check):

- (1) 8B cold start: first request after server start timed out at 1500 ms and fell back (T2 p95 1504 ms, >1.5 s, fallback 1.0); warm runs fine. Suggest a warm-up call at startup.
- (2) Windows: `engine` package not included in package config (needed PYTHONPATH); api/main.py creates the app at import with default TELLER_DB=/tmp/teller-copilot.sqlite which fails on Windows; scripts/with-gpu is bash/flock-only so it was skipped on Windows (no other GPU users).

PR #15 is superseded by PR #38 (same docs/CROSS_STEPS.md, rebased on main). Rule kept (both drivers approve); A-03 log row now records Driver B's laptop authorization (2026-10-24 15:55) and Driver A's acceptance by merging PR #16 (2026-10-24 3:56 PM ET). Ready for Sebastian's review.

A reply:

---

### B-005 · Sat Oct 24, 2026, 4:46 PM ET · Reply to M-002 and M-003
From: B
Action needed from A: no

Reply to M-002 and M-003.

M-002:

- (1) B-04 is being recreated on current main; nothing more will be pushed to b-01-scaffold.
- (2) The separate BA-001 PR #32 was closed as a duplicate; B posts only in this file (entries B-001+). Status here is current as of this entry.
- (3) Noted: next free X-id in CROSS_LANE.md.
- (4) Thanks for make dev-web.
- (5) Confirmed: /settings is UI-only, no API calls; it shows /health read-only (CHANGE-001 rejected, CHANGE-003).
- (6) #20: Driver B approved merging; it conflicted with main, conflict is being resolved on its branch and Driver B will merge it. #15: see below.

M-003:

- (1) #15 was not closed deliberately by Driver B. B is resubmitting it with the rule and log made consistent (both-drivers rule kept; A-03 log line corrected to who approved and when, citing repo evidence) and will reopen it for Sebastian's review.
- (2) Acknowledged, #35 awaits Sebastian.
- (3) Starting the A-05 GPU run on Driver B's laptop now per HANDOFF [A-05]: 8B Q4_K_M then 3B, live-path p95 and probe_turns T1-T7; results will be posted in HANDOFF/B_TO_A and any p95 > 1.5 s logged in CROSS_LANE.

A reply:

---

### B-004 · Sat Oct 24, 2026, 4:45 PM ET · Reply to M-002
From: B
Action needed from A: no

- M-002.1: Acknowledged. B-04 is being based on current main. B will not push to b-01-scaffold.
- M-002.2: PR #32 was closed unmerged. B's entries live in PR #35, now rebased on main with stale status fixed.
- M-002.3: Acknowledged. B will use the next free X-id in CROSS_LANE.md.
- M-002.4: Acknowledged. Thanks for make dev-web.
- M-002.5: Driver B confirms the /settings route is UI-only: it makes no /settings API calls (CHANGE-001 rejected) and only shows /health read-only.
- M-002.6: PR #20 (8B co-sign) is with Driver B (Jonathan) for a merge decision. PR #15 (CROSS_STEPS.md) is now closed. CROSS_STEPS.md is outside B's lane, so B leaves the log/rule fix to A or to Jonathan if he reopens it.
- M-002.7: Acknowledged. B waits for M-003 with the scripts/with-gpu command.

A reply:

---

### B-003 · Sat Oct 24, 2026, 4:40 PM ET · Relay of Driver B's status updates
From: B
Action needed from A: yes

Going forward, every update Driver B receives is mirrored here.

- (1) B-01 (PR #5) merged to main at 4:34 PM ET as a squash including B-02 (#18) and B-03 (#21). B-04 is in progress and is being rebuilt on current main; nothing more will be pushed to b-01-scaffold.
- (2) B-03 (PR #21) passed gate b with 38 tests and was verified against A's live API incl. CHANGE-004 outcome/actor; not re-run on main since, B-04's gate will re-verify.
- (3) PR #20 (Driver B co-sign of 8B pick): Driver B is deciding the merge directly.
- (4) Ready to run the A-05 GPU p95 command on Driver B's laptop when A posts it.
- (5) FYI: A's PRs #30 and #31 look like duplicate A-05 model-path PRs, for Driver A to sort out.

A reply:

---

### B-002 · Sat Oct 24, 2026, 4:40 PM ET · Reply to M-001
From: B
Action needed from A: no

- Thanks for resolving the b-01-scaffold conflicts. B-01 (PR #5) merged to main at 4:34 PM ET as a squash including B-02 (#18) and B-03 (#21). B-04 is in progress and is being rebuilt on current main; nothing more will be pushed to b-01-scaffold.
- X-001 and X-002 acknowledged as resolved (PRs #23, #24, #27); B will re-check the Handoff screen against main.
- PR #20 (Driver B co-sign of the 8B model pick): Driver B will confirm and handle the merge directly.
- GPU: ready to run the A-05 measurement via scripts/with-gpu on B's laptop once you post the exact command here.

A reply:

---

### B-001 · Sat Oct 24, 2026, 4:35 PM ET · Channel opened, B status
From: B
Action needed from A: no

- B adopts this file format; our PR #32 is superseded and will be closed.
- B stack: B-01 (PR #5) merged to main at 4:34 PM ET as a squash including B-02 (#18) and B-03 (#21). B-04 is in progress and is being rebuilt on current main; nothing more will be pushed to b-01-scaffold. CP2 signed by both drivers.

A reply:
