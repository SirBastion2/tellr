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

### M-010 · Sat Oct 24, 2026, 6:47 PM ET · CP3 recorded; B-013 report fields; A-07 next
From: A
Action needed from B: no

CP3 numbers read. Driver A (Sebastian) signs off on B-013 (30 dev scenarios, library 1.2.0, 8B Q4_K_M on RTX 5070). Arm A catch 15/15, false-flag 8/15 (Wilson 30–75%), 6 questions always. Arm B and live-8B Arm C identical: catch 14/15 (70–99%), false-flag 0/15 (0–20%), friction 0/15, questions mean ~3.1 max 5, time to decision mean 40 s, `default_fired` 0/93, validator rejections 0. Arm C latency p50 486 ms / p95 576 ms / max 619 ms, no fallbacks. One miss: `scn.coached.bank_perfect_own_account` — known limit, not to be tuned away on the 30-dev set if that breaks properties. No significance claims on 15 scenarios.

B-013 suggestion done in this PR: `report.md` now shows latency p50/p95/max and `fallback_rate` per arm (A/B and FakeModel: n/a; Arm C: LocalLLM recordings). PR https://github.com/SirBastion2/tellr/pull/53

A-07 tuning begins. Weights freeze at hour 20. B should not run the held-out set. B-07 remains B's lane.

B reply:

---

### M-009 · Sat Oct 24, 2026, 6:45 PM ET · CP3 GPU run now; B-011/B-012; Figma UI
From: A
Action needed from B: yes

1. Sebastian reports the team is back and GPU access is restored. Please run `docs/CP3_GPU_RUN.md` now (8B Q4_K_M, arm C local model) and paste the Arm C `report.md` headlines into `docs/B_TO_A.md`. This is CP3 (hour 15) and gates A-07 tuning.

2. Acknowledging B-011/B-012 (CP3 was on hold; B-05 #49 is B's to merge; B-009/B-010 in B's PR #47 are on his side). A did not edit `docs/B_TO_A.md`.

3. The team will have its own custom UI designed in Figma by someone else. A keeps `api/` and `contract/` UI-agnostic, so B should not assume current `web/` screens are final. Flag any API/contract field the Figma design needs via the change protocol (`WORKFLOW.md` §5) or `docs/CROSS_LANE.md`.

B reply:

---

### M-008 · Sat Oct 24, 2026, 5:14 PM ET · A-06 harness #46; X-003 closed; CP3 GPU on hold
From: A
Action needed from B: yes (when GPU access is back)

A-06 harness #46 is merged (arms A/B/C, 143 tests, `scripts/gate.sh a`). Hours 12–15 add `--model local` (A-05 LocalLLM, timeout off) and this runbook.

Acknowledging B-008, B-009, B-010 (B-009/B-010 read from PR #47; A did not edit `docs/B_TO_A.md`):

- **B-008:** X-003 Windows part verified at `a7e189e` (`pip install -e .`, no `PYTHONPATH`, default DB `%TEMP%\teller-copilot.sqlite`, uvicorn starts, `/health` 200).
- **B-009:** B-04 (#39) merged; #35, #38, #45 merged; 8B cold-start retest after #44 was in progress.
- **B-010:** 8B cold-start retest PASS on RTX 5070, native Windows, 8B Q4_K_M. First live call 370 ms, no fallback. T1–T7 (11 calls): p95 420 ms, fallback 0.0, agreement 0.909, VRAM 6246/8151 MiB.

X-003 is **fully resolved** in `docs/CROSS_LANE.md` (Windows verified B-008; 8B cold start verified B-010).

**CP3 GPU arm-C run is on hold.** Driver B's team is moving locations, so the GPU laptop may be unavailable. Do not run `docs/CP3_GPU_RUN.md` until you report in `docs/B_TO_A.md` that GPU access is back. Then run that runbook on the GPU laptop (8B Q4_K_M; Git Bash/WSL: `scripts/with-gpu`; native Windows: skip the wrapper) and paste the Arm C `report.md` headlines back.

A continues with non-GPU work meanwhile (fake-model dev results, A-07 prep).

B reply:

---

### M-007 · Sat Oct 24, 2026, 4:57 PM ET · X-003 part 2: Windows live-path fixes
From: A
Action needed from B: yes

X-003 part 2 (Windows live path; Driver B on main @6890808):

1. `engine` is now in `pyproject.toml` `[tool.setuptools.packages.find]`. After `pip install -e .`, no manual `PYTHONPATH` is needed.
2. Default DB is `Path(tempfile.gettempdir()) / "teller-copilot.sqlite"` instead of hardcoded `/tmp/teller-copilot.sqlite`. On Linux/macOS with the usual temp dir this is still `/tmp/teller-copilot.sqlite`. `TELLER_DB` override is unchanged.
3. `scripts/with-gpu` stays bash/`flock`. On native Windows, skip the wrapper and run the same command directly, one GPU job at a time (see the script header and the new HANDOFF entry). WSL/Git Bash can still use the script.
4. Correction to M-005 item 5: #38 (`docs/CROSS_STEPS.md`) is B's PR and B merges his own PRs; A will not merge or review it.

PR: https://github.com/SirBastion2/tellr/pull/43

Please confirm the live path on Windows (`pip install -e .`, `python -m uvicorn api.main:app`, no `PYTHONPATH`, no `/tmp` default DB) and reply in `docs/B_TO_A.md`.

B reply:

---

### M-006 · Sat Oct 24, 2026 · X-003 part 1: 8B warm-up fix
From: A
Action needed from B: yes

X-003 part 1: first live `local_llm` request after llama-server start was missing the 1500 ms budget (T2 p95 1504 ms, fallback 1.0) because that call paid the 8B cold start. Warm runs were 600–750 ms.

**What changed:** when `RECOMMENDER` is `local` / `local_llm`, FastAPI lifespan now fires one bounded llama-server `/completion` (stable prefix + GBNF, `MODEL_WARMUP_TIMEOUT_MS` default 15000) so the cold hit is paid at startup. It swallows connection errors (boot still works with no model server) and is not recorded in `/health` p50/p95 or fallback stats. Live timeout stays 1500 ms. No contract or schema change.

PR: https://github.com/SirBastion2/tellr/pull/44

Please re-run the cold-start check on the GPU laptop: start llama-server (8B Q4_K_M), then the first live-path request after that start (same `scripts/with-gpu env RECOMMENDER=local_llm …` block in the [A-05] HANDOFF). Reply here or in `docs/B_TO_A.md` with p95 and fallback_rate.

B reply:

---

### M-005 · Sat Oct 24, 2026 · ARCHITECTURE.md map; #8 and #30 merged; #39 and #38
From: A
Action needed from B: yes

1. `ARCHITECTURE.md` now exists at the repo root as the one-page map. Open it first on every card; then open only the files it points to. Any PR that adds, removes, or moves a file in B's lane (`web/`) must update `ARCHITECTURE.md` in the same PR.
2. PR #8 (A-06 eval validator + first 15 development scenarios) is merged.
3. A-05 (model path) #30 is merged.
4. B-04 (#39) noticed. B reviews his own lane; A will not review `web/` files.
5. #38 (`docs/CROSS_STEPS.md`) is awaiting Sebastian's review.

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
