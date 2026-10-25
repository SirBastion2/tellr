# Teller Copilot: Agent Roster

**Companion to** `WORKFLOW.md` and `docs/architecture.md` (v1.2). `WORKFLOW.md` runs the build with
one agent per part. This document says how many agents each part actually needs, what each one
owns and does hour by hour, and what to change in the kit to run it.

---

## 1. The answer

| Part | Agents | Who |
|---|---:|---|
| **A — backend** | **3** | **A1** Engine · **A2** Platform · **A3** Evaluation |
| **B — frontend** | **1**, plus 1 optional from hour 8 | **B1** Frontend · (**B2** Review screens) |
| Support | 2, not building | **R** Reviewer at phase ends · **H** Held-out writer, once, at hour 20 |

That is **four agents building at once** (five with B2), which is the most two people can supervise
properly. Every agent needs its plan approved and stops at checkpoints, and past about two builders
per person, review is what slips.

### Why three for A

A carries most of the work and most of the risk. Run by one agent, it is a single serial track,
which is why the architecture's §17 plan can't start the evaluation until hour 12. It splits cleanly
into three pieces that barely touch:

- **The scoring core** is a careful, sequential port of `reference_impl.py`. It is the critical
  path and should have an agent to itself.
- **The platform** (database, API, model path) can be built against a stand-in for the engine, so it
  no longer waits for the core.
- **The evaluation** mostly means writing 30 scenarios, which only needs the scenario format and the
  library's question intents. Both exist from hour 2. With its own agent, the evaluation starts
  10 hours earlier than in §17, and the scenarios get written with care rather than in a rush at
  hour 12.

### Why only one for B

The frontend is one React app with shared components and one `package.json`. Splitting it early
means two agents editing the same shared code. One agent working against the fixtures covers all
eight screens within §17's timeline. A second agent only becomes safe after hour 8, once the shared
core has stopped changing, and only for screens nothing else depends on (§6).

### Why not more

- **Supervision.** Four builders is already two per driver.
- **One GPU.** Model-dependent work has to take turns (§5.3), so more agents on A would queue.
- **No clean seam.** Nothing left in the plan splits by directory without two agents sharing
  files.

---

## 2. Who supervises whom

| Driver | Supervises | Also |
|---|---|---|
| **Driver A** | A1 Engine, A3 Evaluation | Reviews every `eval/` PR; approves the weight tuning |
| **Driver B** | B1 Frontend, A2 Platform | Runs R at phase ends (except `eval/` PRs); runs H at hour 20 |

This pairing is deliberate, for two reasons:

- **Driver B owns the API boundary from both sides.** B1 consumes the API and A2 builds it, so one
  person sees every mismatch first.
- **Driver B stays clean for the held-out set.** The scoring logic, its tuning, and the development
  scenarios all sit with Driver A. Architecture §13.4 wants the held-out set written by "whoever
  did not tune." Here that is literally true of both the agent (H, brand new) and the human
  supervising it (Driver B, who never sees the development scenarios or the weights).

To keep it true, Driver B does not read `eval/scenarios/dev/` or `library/signals.yaml`. That is why
Driver A reviews `eval/` PRs rather than R.

---

## 3. What each agent owns

Ownership is by directory, never by feature. That is what keeps merges conflict-free.

| Path | Owner | Others |
|---|---|---|
| `engine/`, `library/` (including `signals.yaml`), `tests/engine/`, `tests/golden/`, `tests/library/` | **A1** | read |
| `api/`, `store/`, `recommenders/`, `tests/api/`, `tests/store/`, `tests/recommenders/` | **A2** | read |
| `pyproject.toml`, `Makefile`, `.importlinter`, `tests/conftest.py`, `scripts/bench_*`, `scripts/with-gpu` | **A2** | request changes through A2 |
| `eval/` except `eval/scenarios/heldout/`, `tests/eval/` | **A3** | read (but see §2) |
| `eval/scenarios/heldout/` | **H**, once | — |
| `web/` | **B1** | read |
| `web/src/screens/history/`, `web/src/screens/settings/`, `web/e2e/` | **B2**, if added at hour 8 | — |
| `contract/`, `reference_impl.py`, `docs/architecture.md`, `tests/golden/reference_weights.yaml` | nobody; change process only | read |
| `docs/HANDOFF.md` | pointer; do not edit per PR | read |
| `docs/handoff/` | everyone; one new file per PR | — |
| `docs/QUESTIONS.md` | everyone, append only | — |

**Shared files have exactly one owner.** `pyproject.toml`, the `Makefile`, and the root
`tests/conftest.py` belong to A2. When A1 or A3 needs a dependency or a make target, they ask in
a new `docs/handoff/` file and A2 adds it. `web/package.json` belongs to B1, even after B2 joins.

---

## 4. The agents

### A1 · Engine — the critical path

**Job:** the pure scoring core (architecture §4–§8.4), the library, and the golden tests proving it
matches `reference_impl.py`.

| Hours | Work | Done when |
|---|---|---|
| 0–2 | P0: confirm every field of `SessionState` can be computed by the fold (§4) | Gaps logged in QUESTIONS |
| 2–3 | Library YAML and boot validation (A-01, library half) | Boot fails on bad IDs, missing `asserts_on`, missing rationale |
| **3** | **Freeze the engine interface** (§5.1) and commit `FakeEngine` | Tag `engine-api-v1`; A2 unblocked |
| 3–6 | Reducer, scorer, ranker (A-02) | All seven properties pass over 65,536 sets |
| 6–8 | Eligibility, stop rule, rule engine, golden traces (A-04, engine half) | T1–T7 match `reference_impl.py` exactly |
| 8–12 | Grow the question bank to ~40; the three remaining patterns, marked for compliance review | Boot validation passes on the full bank |
| 12–18 | Fix what A2's integration and A3's evaluation turn up; add the live-weights property test | Gate green |
| 18–20 | **Tune the weights** (A-07) with A3's harness, then freeze | Tag `weights-frozen`; golden tests untouched |
| 20–24 | Support the demo | — |

### A2 · Platform — everything around the engine

**Job:** the repo skeleton, the database, the API and its command handler, the model path, and the
demo fallbacks. **A2 owns the GPU.**

| Hours | Work | Done when |
|---|---|---|
| 0–2 | P0: review `api.md` and decide the error shape with the drivers (CHANGE-002) | Decision logged |
| 2–4 | `pyproject.toml`, `Makefile`, `.importlinter`, `conftest.py`; the database with the §10.1 tests (A-01, platform half) | Gate `a` runs; store tests pass |
| 4–6 | The API against `FakeEngine`; command-handler error mapping; the contract-conformance test written (it fails until the engine arrives) | Endpoints respond with schema-valid states |
| **6** | **Latency benchmark** (A-03), holding the GPU lock | p95 in that card's `docs/handoff/` file; drivers pick the model (CP1) |
| 6–8 | Swap in the real engine; contract conformance goes green (A-04, API half) | **CP2:** works end to end with no model |
| 8–12 | Model path: grammar, validator, timeout, prompt allowlist (A-05) | §9 recommender tests pass |
| 12–15 | `/health` with agreement rate; `--replay` mode (§14.2); live-path p95 | Replay is pixel-identical to a live run |
| 15–24 | Fixes; settings endpoint if CHANGE-001 was accepted; record replay logs (J-01) | Two replay logs play back |

### A3 · Evaluation — the numbers on the slide

**Job:** pre-registration, the 30 development scenarios, the three-arm harness, the report, and the
single held-out run (architecture §13).

| Hours | Work | Done when |
|---|---|---|
| 0–2 | P0: check the scenario format against `contract/library.json` | Gaps logged |
| 2–6 | `eval/validate.py`; draft `PREREGISTRATION.md`; development scenarios from the contract's intents | 15 scenarios validated |
| 6–8 | Finish 30 scenarios (§5.2 has the mix). **Commit `PREREGISTRATION.md` alone, before any run** | The commit order proves it came first |
| 8–12 | Harness, arms A (static) and B (rules); determinism tests | The same scenario twice gives identical results |
| 12–15 | Arm C under the GPU lock; the report generator | Report has every metric in §13.3 |
| **15** | **First full run** | **CP3:** drivers read `report.md` |
| 15–20 | Report fixes; run the harness for A1's tuning; prepare the held-out run | — |
| 20–21 | **Run the held-out set once** (A-08), after R confirms H's commit | Results committed, never rerun |
| 21–24 | Numbers for the writeup | — |

A3 never edits weights. Tuning belongs to A1, which owns `library/`. A3 supplies the harness.

### B1 · Frontend

**Job:** every screen, the mock server, and the hour-8 switch to the real API. This is the B track
from `WORKFLOW.md`, unchanged.

| Hours | Card | Done when |
|---|---|---|
| 0–2 | P0: step through fixtures T1 and T3; list anything the UI can't render | Gaps logged |
| 2–4 | B-01 scaffold, mock server, shells. **Push the bare scaffold within the first hour** so B2 can start later | Gate `b` passes |
| 4–6 | B-02 Interview screen | Every fixture step renders correctly |
| 6–8 | B-03 Outcome and Handoff, then the real API at hour 8 | **CP2** with A2 |
| 8–12 | B-04 talk tracks, undo, practice mode | — |
| 12–15 | B-05 polish and accessibility | — |
| 18–20 | B-06 History and Settings (moves to B2 if B2 exists) | — |

### B2 · Review screens (optional, from hour 8)

**Add B2 only if** B1 is behind at hour 8 and Driver B can take on a third agent, or A2 is in a lull.
It takes the leaf screens that nothing else imports, plus the end-to-end tests:

- B-06, History and Settings, moved earlier to hours 8–12;
- Playwright end-to-end tests for T1 and T2 (ECC's `e2e-testing` skill), hours 12–15;
- an accessibility audit across all screens. B2 reports problems in B1's screens; B1 fixes them.

B2 never edits shared components, routing, the API client, or `web/package.json`. If it needs a
shared change, it asks B1.

### R · Reviewer

**Job:** the `R-review.md` checklist on every PR at each phase end (hours 4, 6, 8, 12, 15, 20, 24),
then merge. Runs as a fresh chat in the `main` window, driven by Driver B. **Exception:** Driver A
reviews `eval/` PRs (§2).

With four or five builders merging per phase, R spends about 15 minutes per phase end. Merge order
within a phase: **A1, then A2, then A3, then B1, then B2**, because each later one may depend on the
earlier. Disjoint directories mean the order rarely matters, and a conflict outside `docs/` means
somebody crossed a boundary.

### H · Held-out writer (once)

**Job:** card B-07 at hours 20–21, in a brand-new agent and chat, in the stripped `tc-heldout`
worktree (WORKFLOW §10), supervised by Driver B. H never existed before this hour, so its context
contains nothing from development. It writes 10 scenarios, commits only `eval/scenarios/heldout/`,
and is never used again.

---

## 5. Coordination the extra agents need

Problems one lane finds in the other's work are logged in `docs/CROSS_LANE.md`; do not fix the other lane's files.

### 5.1 An internal interface inside A

The A/B contract lets B work without waiting for A. The same idea inside A lets A2 work without
waiting for A1. At **hour 3**, A1 commits the engine's public interface and a stand-in for it, and
tags `engine-api-v1`:

```python
# engine/__init__.py  (A1; frozen at engine-api-v1; signatures finalised by A1)
def load_library(path) -> Library                                 # §5, boot validation
def project(events: list[Event], lib: Library) -> SessionState    # §4, §6, §7.1: the fold
def candidates(state, lib) -> tuple[Stage, list[QuestionId]]      # §7.2
def stop(state, lib, cands) -> Stop | None                        # §8.4, CHANGE-000 precedence
def rule_choice(cands) -> QuestionId                              # §7.3
def check_command(events, command, lib) -> None                   # raises CommandRejected(code)

# engine/testing.py
class FakeEngine: ...   # replays contract/fixtures, so A2 can build the API before the real engine
```

The API, owned by A2, runs each turn in the §3 order:
- the fold, the candidates, and the stop check;
- the recommender, during the probe stage only;
- the validator, then the append.

The engine never imports `recommenders/` (`.importlinter` enforces it), which is why turn
orchestration lives in `api/` and not in `engine/`.

Interface changes go through `QUESTIONS.md` and Driver A's approval. That is lighter than the
contract process, because only A1 and A2 are affected.

### 5.2 Development scenario mix (A3)

30 scenarios, matching architecture §13.1:
- **15 coached**, including at least 4 cover stories (stated purpose differs from the true
  pattern) and at least 3 perfectly coached;
- **15 legitimate**, including at least 4 with an innocent red-flag chip and at least 3 vague but
  genuine.

Seed from the seven reference cases. Base the rest on public scam guidance (AARP, FTC, FBI).

### 5.3 One GPU, taking turns

A2 runs `llama-server` continuously. Anything that sends it model requests waits its turn behind
one lock file. That covers A-03's benchmark, A3's arm C runs, and A1's tuning runs:

```bash
# scripts/with-gpu  (A2)
#!/usr/bin/env bash
exec flock /tmp/tc-gpu.lock "$@"

scripts/with-gpu python3 scripts/bench_llm.py
scripts/with-gpu python3 -m eval.run --arm model
```

Without the lock, two agents running at once corrupt the latency numbers and break the evaluation's
batch-size-one determinism (§13.4) without any error message.

### 5.4 Handoffs between A agents

| From → to | When | What |
|---|---|---|
| A1 → A2 | Hour 3 | `engine-api-v1` and `FakeEngine` |
| A1 → A2 | Hour 8 | The real engine; A2 swaps it in |
| A1 → A3 | Hour 4, then hour 12 | Library intents and chips (scenario validation); the full ~40-question bank |
| A2 → A3 | Hour 12 | Model path ready; arm C can run |
| A3 → A1 | Hour 18 | The harness for tuning |
| A1 → A3 | Hour 20 | Tag `weights-frozen`; the held-out run uses it |
| H → A3 | Hour 21 | Held-out scenarios, after R checks the commit |

Every handoff is its own file in `docs/handoff/` naming the tag or commit. List that directory newest first. `docs/HANDOFF.md` is only the pointer.

---

## 6. Combined timeline

| Hours | A1 Engine | A2 Platform | A3 Evaluation | B1 Frontend | B2 (optional) | R / H / drivers |
|---|---|---|---|---|---|---|
| 0–2 | P0 review | P0 review | P0 review | P0 review | — | R runs P0; tag `contract-v1` |
| 2–4 | Library; interface at **h3** | Skeleton, store | `validate.py`, scenarios | B-01 | — | R merges |
| 4–6 | Reducer, scorer, ranker | API on `FakeEngine` | Scenarios (15) | B-02 | — | R merges |
| 6 | — | **Benchmark** | — | — | — | **CP1: model** |
| 6–8 | Eligibility, stop, golden | Real engine; conformance | 30 scenarios; **pre-register** | B-03; real API | — | **CP2: no-model product** |
| 8–12 | ~40 questions, 3 patterns | Model path | Arms A, B | B-04 | B-06 | R merges |
| 12–15 | Fixes; live-weights test | `/health`, replay | Arm C, report | B-05 | End-to-end, accessibility | R merges |
| 15–18 | Fixes | Fixes | **First run**; fixes | Fixes | Fixes | **CP3: numbers** |
| 18–20 | **Tune, freeze** | Demo hardening | Harness for tuning | B-06 | Fixes | Tag `weights-frozen` |
| 20–21 | — | — | **Held-out run** | — | — | **H writes held-out** |
| 21–24 | Demo | Replay logs | Writeup numbers | Polish | Polish | Rehearse; tag `demo` |

---

## 7. Changes to make in the kit

`WORKFLOW.md` and the kit assume one agent per part. To run this roster:

**Worktrees and memory** (WORKFLOW §2.1, §2.3), one per agent:

```bash
for a in a1 a2 a3 b1; do
  git worktree add ../tc-$a -b agent-$a
  echo "{\"agentDataHome\": \"~/.cursor/ecc-agent-$a\"}" > ../tc-$a/.cursor/ecc-agent-data.json
done
# B2 at hour 8 only if needed:  git worktree add ../tc-b2 -b agent-b2   (and its own memory file)
# H at hour 20:                 the tc-heldout worktree from WORKFLOW §10
```

**Rules.** Replace `tc-10-agent-a.mdc` with three rules, keeping its content but scoping each to its
owner's folders:

| New rule | `globs` | Content taken from `tc-10-agent-a.mdc` |
|---|---|---|
| `tc-11-agent-a1-engine.mdc` | `engine/**`, `library/**`, `tests/engine/**`, `tests/golden/**`, `tests/library/**` | Engine and golden-test sections |
| `tc-12-agent-a2-platform.mdc` | `api/**`, `store/**`, `recommenders/**`, `tests/api/**`, `tests/store/**`, `tests/recommenders/**`, `scripts/**`, `pyproject.toml`, `Makefile` | API, store, and model-path sections, plus the GPU lock |
| `tc-13-agent-a3-eval.mdc` | `eval/**`, `tests/eval/**` | Eval section, plus "never edit weights" |

Add a B2 section to `tc-20-agent-b.mdc` if B2 joins: its three folders, and "ask B1 for shared
changes."

**`tc-00-project.mdc`.** Update the roles line and the ownership list to match §3. Add two lines:
"model-dependent jobs run through `scripts/with-gpu`" and "Driver B does not read
`eval/scenarios/dev/` or `library/signals.yaml`."

**Task cards.** A-01 and A-04 each split in two, as in the A1 and A2 tables; A-06 moves to A3 and
starts at hour 2; A-07 goes to A1; A-08 to A3; B-07 to H. The other cards are unchanged.

**`R-review.md`.** The ownership check compares each PR against §3, per agent. Add: "`eval/` PRs are
reviewed by Driver A."

---

## 8. Scaling down mid-build

If a driver is overloaded, merge agents in this order. Each step undoes the split that matters
least at that point in the build:

1. **Drop B2.** B1 takes its screens back.
2. **After hour 15, fold A3 into A1.** The harness exists and A1 is tuning against it anyway.
   A3's held-out run (A-08) can then be done by R.
3. **After hour 12, fold A2 into A1.** The model path is done; what's left is fixes and demo work.

Never fold H into anything. The held-out writer is the one agent whose value comes from being new.
