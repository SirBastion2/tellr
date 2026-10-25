# Teller Copilot: Multi-Agent Cursor Workflow

**Companion to** `docs/architecture.md` (v1.2), which splits the build into **A (backend)** and
**B (frontend)** in §17. This workflow runs that split with two or more AI agents in Cursor, using
patterns from ECC ([everything-claude-code](https://github.com/ai-imitation/everything-claude-code),
a fork of `affaan-m/ECC`).

---

## 0. Quick start

1. Unzip this kit into an empty repo, commit, and create two worktrees (§2.1).
2. Install ECC for Cursor once, Python and TypeScript only (§2.2).
3. Open three Cursor windows: `main` for the reviewer, `tc-agent-a`, and `tc-agent-b`.
4. Run phase 0, the contract freeze, with `prompts/P0-contract.md` (§5).
5. From then on, each agent works the card for its phase (`prompts/A-0n.md`, `prompts/B-0n.md`)
   through the operating loop in §3, and merges at the end of each phase (§7).
6. Humans make every checkpoint decision (§6). Agents never decide those.

Everything below explains why the kit is shaped this way, so you can bend it without breaking it.

---

## 1. Roles

| Role | Who | Owns | ECC pieces it leans on |
|---|---|---|---|
| **Agent A — backend** | Cursor agent in `tc-agent-a` | `engine/`, `recommenders/`, `api/`, `store/`, `library/`, `eval/`, `tests/`, `scripts/bench_*` | `rules/common` + `rules/python`; `tdd-workflow`, `python-testing`, `verification-loop`, `eval-harness` skills; `python-reviewer`, `build-error-resolver` agents |
| **Agent B — frontend** | Cursor agent in `tc-agent-b` | `web/` (app and mock server) | `rules/common` + `rules/typescript`; `frontend-patterns`, `e2e-testing` skills; `typescript-reviewer` agent |
| **Agent R — reviewer** (the "+") | Cursor agent in the `main` window | Merges to `main`, the contract, phase-end reviews | `code-reviewer`, `security-reviewer` agents; `verification-loop` skill; `/quality-gate`, `/code-review` |
| **Driver A, Driver B** | The two humans | One agent each, plus every checkpoint decision and contract change | — |

**With only two agents,** R's duties fall to the humans at phase ends: run the review checklist
(`prompts/R-review.md`) in a fresh chat in the `main` window, then merge.

**With more than three,** split by directory, never by feature. From hour 8 the natural third builder
is **A2**, taking `recommenders/` (card A-05) in its own worktree while A continues on `api/` and
`eval/`. Two agents must never own the same directory.

---

## 2. Setup (once, about 20 minutes)

> **HackPSU rule check.** Draft §13 flags pre-written project materials as a possible gray area
> under the build-on-site rule. Tooling config (rules, prompts, gates) is usually fine. The contract,
> fixtures, `reference_impl.py`, and library copy are project artifacts. **Confirm with organizers
> before using them pre-built.** If in doubt, regenerate them at the event: phase 0 does exactly
> that in under two hours.

### 2.1 Repo and worktrees

ECC's longform guide recommends git worktrees for parallel agents. Each agent gets its own working
copy and branch, so they cannot overwrite each other's files mid-edit.

```bash
mkdir teller-copilot && cd teller-copilot && git init
unzip ../teller-copilot-cursor-kit.zip -d . && git add -A && git commit -m "chore: workflow kit"
for a in a1 a2 a3 b1; do
  git worktree add ../tc-$a -b agent-$a
  echo "{\"agentDataHome\": \"~/.cursor/ecc-agent-$a\"}" > ../tc-$a/.cursor/ecc-agent-data.json
done
# B2 at hour 8 only if needed:  git worktree add ../tc-b2 -b agent-b2   (and its own memory file)
# H at hour 20:                 the tc-heldout worktree from WORKFLOW §10
cursor .         # R  (main)
cursor ../tc-a1  # A1
cursor ../tc-a2  # A2
cursor ../tc-a3  # A3
cursor ../tc-b1  # B1
```

### 2.2 ECC for Cursor

Pin a commit, because ECC moves fast; it is at a 2.0 release candidate with thousands of commits.
Install **only** the Python and TypeScript packs into the project:

```bash
git clone https://github.com/affaan-m/ECC.git ~/src/ECC   # or the ai-imitation fork
cd ~/src/ECC && git checkout <pinned-sha>
./install.sh --target cursor python typescript           # run as ECC's Cursor guide directs for a project
```

- **Use one install path.** ECC's README warns that stacking install methods duplicates skills
  and hooks. If anything looks doubled, use its documented uninstall, then install once.
- Commit the resulting `.cursor/` so both worktrees inherit it. This kit's own rules are prefixed
  `tc-` so they never collide with ECC's (which prefixes its agents `ecc-`).
- Skip the `multi-*` commands. ECC documents that they need a separate Claude-side runtime, and they
  are not part of this workflow.
- Keep MCP servers to a minimum. ECC warns that each one consumes context, and this build needs
  none.

### 2.3 Keep the agents' memories separate

ECC's memory hooks write session summaries to one agent-data directory. Inside Cursor that defaults
to `~/.cursor/ecc`, so **the agents would read each other's session notes.** Give each worktree its
own, either via the project file ECC documents (not committed, since it differs per worktree). The
§2.1 loop already writes that file; the same loop, memory only:

```bash
for a in a1 a2 a3 b1; do
  echo "{\"agentDataHome\": \"~/.cursor/ecc-agent-$a\"}" > ../tc-$a/.cursor/ecc-agent-data.json
done
# B2 at hour 8 only if needed:  its own memory file under ../tc-b2/.cursor/
# H at hour 20:                 the tc-heldout worktree from WORKFLOW §10
echo ".cursor/ecc-agent-data.json" >> .git/info/exclude
```

or by launching each window with `ECC_AGENT_DATA_HOME=~/.cursor/ecc-agent-a1 cursor ../tc-a1`.

### 2.4 Hooks that will bite

- **Dev servers outside tmux are blocked.** ECC's `beforeShellExecution` hook stops them. Run the
  API and Vite in tmux panes (`make dev-api`, `make dev-web`, created in A-01 and B-01). If you must
  disable that hook, find its ID in ECC's hooks README and add it to `ECC_DISABLED_HOOKS`, rather
  than turning hooks off wholesale.
- **TypeScript checks after every edit.** `afterFileEdit` runs formatting and a type check. Useful,
  but slow on a large edit. If it drags, set `ECC_HOOK_PROFILE=minimal` for B's window.
- **Secrets in prompts are caught.** `beforeSubmitPrompt` flags key-shaped strings. Keep hosted-model
  keys in `.env` and never paste them into chat.

### 2.5 Where Cursor behavior varies

ECC notes that Cursor's loading of project agents (`.cursor/agents/`) and commands varies by build.
This kit therefore relies on what is portable: **rules** (`.cursor/rules/tc-*.mdc`) for standing
constraints, and **task cards** (`prompts/`) pasted or `@`-referenced into the agent chat. If your
build exposes ECC's `/plan` and `/code-review`, use them in the loop below; if not, `@`-reference
the matching `.cursor/agents/ecc-*.md` file and ask the agent to follow it.

---

## 3. The operating loop (every card, every time)

Adapted from ECC's plan → test first → review → verify workflow, tightened for 24 hours.

1. **Load narrowly.** Open the card and `@`-reference only the architecture sections it cites. This
   is ECC's iterative-retrieval idea: the architecture document is 1,500 lines, and an agent that reads
   all of it for every task spends its context on sections it doesn't need.
2. **Plan in five to ten lines** (`/plan` or the planner agent). The driver approves in under a
   minute. A plan that touches a directory the agent doesn't own is rejected on sight.
3. **Tests first** (`tdd-workflow`). Write the card's acceptance tests and watch them fail.
4. **Implement to green.**
5. **Gate.** `scripts/gate.sh a` or `scripts/gate.sh b` must pass. Agents do not get to argue with
   the gate.
6. **Review** the diff with the language reviewer agent (`python-reviewer` or `typescript-reviewer`).
7. **Hand off.** Write a new file `docs/handoff/<yyyymmdd-hhmm>-<short-branch-slug>.md`
   using the template in `docs/HANDOFF.md`. Do not edit `docs/HANDOFF.md`. Commit with a
   conventional message, and push the branch.
8. **Stop at checkpoints.** If the card ends in a checkpoint, the agent stops and the driver decides.

**Stop-and-ask triggers.** These are written into `tc-00-project.mdc`. The agent stops and logs to
`docs/QUESTIONS.md` instead of improvising when:
- a task needs a contract change;
- the architecture document contradicts itself or the card;
- a golden or property test fails for a reason the card doesn't explain;
- it wants to edit outside its directories.

Every one of these happened while the architecture was being written. They are where agents
quietly do damage.

**Reset rather than spiral.** If an agent is stuck for 20 minutes or its context is visibly bloated,
start a fresh chat with the card plus the newest file in `docs/handoff/` (list that directory newest first). ECC's `strategic-compact` skill
says the same thing more politely.

---

## 4. Boundaries

| Path | Owner | Others may |
|---|---|---|
| `engine/`, `recommenders/`, `api/`, `store/`, `library/`, `eval/`, `tests/` | A | read |
| `web/` | B | read |
| `contract/` | **nobody** — change protocol only (§5) | read |
| `docs/architecture.md`, `reference_impl.py`, `tests/golden/reference_weights.yaml` | **nobody** — read-only oracles | read |
| `docs/HANDOFF.md` | pointer only; do not edit per PR | read |
| `docs/handoff/` | everyone; one new file per PR | add a file |
| `docs/QUESTIONS.md` | everyone, append-only | append |
| `docs/DECISIONS.md` | humans | read |

Two rules matter more than the rest:

- **`reference_impl.py` is the oracle.** Agent A ports it; golden tests compare the engine with it
  exactly. If they disagree, the engine is wrong until a human decides otherwise.
- **Golden expectations are never edited to make a test pass.** After tuning (A-07) the live
  weights will differ from the reference weights. That is why golden tests load
  `tests/golden/reference_weights.yaml`, never `library/`. An agent that "fixes" a golden test by
  changing its expected values has hidden a bug, and the review checklist looks for exactly that.

---

## 5. The contract and how it changes

Phase 0 freezes the interface between A and B (architecture §11 and §17). This kit ships a draft:

| File | What it is |
|---|---|
| `contract/api.md` | Endpoints (architecture §11.1) plus the clarifications in `CHANGES.md` |
| `contract/events.md` | Event types and undo semantics (architecture §4) |
| `contract/session_state.schema.json` | `SessionState` (architecture §11.2) as JSON Schema |
| `contract/library.schema.json`, `contract/library.json` | `GET /library` shape and a sample |
| `contract/fixtures/T1.json` … `T7.json` | Every step of the seven reference cases (§6.4) as `SessionState`, **generated from `reference_impl.py`** |
| `contract/CHANGES.md` | The change log, starting with two items found while building this kit |

**Why fixtures from the reference implementation:** B's mock server replays them, and A's API must
reproduce them. Both sides test against one artifact, so "the frontend works against the mock" and
"the backend matches the spec" become the same claim. `scripts/check_contract.py` validates every
fixture against the schema, and regenerates them to confirm they still match `reference_impl.py`.

**Two items need a decision in phase 0**, both logged in `contract/CHANGES.md`:

- **CHANGE-000, applied.** Architecture §8.4 doesn't say what happens when a recommended stop and the
  empty-candidate hard stop hold at once (T1's last step in the six-question bank). The contract
  makes the hard stop win the `kind` and keeps both reasons, which matches §11.2's "question is null
  only on a hard stop."
- **CHANGE-001, proposed.** Architecture §7.4 says the recommender is "swappable at runtime from
  Settings," and §12 lists a Settings screen, but §11.1 has no settings endpoint. B-06 cannot be
  built without one. The proposal is `GET`/`POST /settings`.

**Change protocol after `contract-v1`:**
1. The agent stops and writes the request in `docs/QUESTIONS.md`.
2. A driver writes `CHANGE-nnn` in `contract/CHANGES.md`, with the reason and the diff.
3. Both drivers approve.
4. R applies it on `main`, bumps `CONTRACT_VERSION`, runs `python scripts/gen_fixtures.py` and
   `scripts/gate.sh contract`, and tags the commit.
5. Both agents rebase.

Budget: at most two changes after hour 4. Each one costs both agents a rebase.

---

## 6. Phase plan

Mirrors architecture §17 hour for hour. Each cell names its task card in `prompts/`.

| Hours | Phase | Agent A (backend) | Agent B (frontend) | R / drivers | Exit |
|---|---|---|---|---|---|
| 0–2 | P0 contract | `P0-contract` (review) | `P0-contract` (review) | Run P0; drivers approve | tag `contract-v1` |
| 2–4 | P1 | `A-01` skeleton, library, store | `B-01` scaffold, mock, shells | — | gates; merge |
| 4–6 | P2 | `A-02` reducer, scorer, ranker | `B-02` interview screen | — | gates; merge |
| 6 | **CP1** | `A-03` latency benchmark | (continue B-02 polish) | **Drivers pick the model** | `DECISIONS.md` |
| 6–8 | P3 | `A-04` eligibility, stop, rules, API | `B-03` outcome, handoff, real-API switch | Integration run at hour 8 | **CP2: works with no model** |
| 8–12 | P4 | `A-05` model path (or A2) | `B-04` talk tracks, undo, practice | `R-review` | merge |
| 12–15 | P5 | `A-06` eval harness, 30 dev scenarios | `B-05` polish, accessibility | — | merge |
| 15–18 | **CP3** | First eval run; fix what it shows | Fixes from integration | **Drivers read the numbers** | `DECISIONS.md` |
| 18–20 | P6 | `A-07` tune and freeze | `B-06` history, settings | — | tag `weights-frozen` |
| 20–21 | P7 | `A-08` run held-out once | `B-07` write held-out (isolated) | R verifies isolation | results committed |
| 21–24 | P8 | `J-01` replay logs, writeup | `J-01` | Drivers rehearse | demo |

The dependency that matters: **B never waits for A.** Until hour 8, B works entirely against
the fixtures; at hour 8 it points at the real API and every mismatch is either an A bug or a
contract question. Neither one is a frontend workaround.

---

## 7. Sync points and merging

- **Merge at phase ends**, not continuously. Each agent rebases on `main`, passes its gate, and
  opens a PR; R runs `prompts/R-review.md`; a driver merges. The agents own disjoint directories, so
  merges should be conflict-free. A conflict anywhere other than `docs/` means someone crossed a
  boundary, and that is the thing to fix.
- **Cross-lane findings** go in `docs/CROSS_LANE.md`: log the problem; do not fix the other lane's
  files. The owning driver triages at each phase end. Contract or golden-test changes go through
  `contract/CHANGES.md`; spec ambiguities still go in `docs/QUESTIONS.md`. An agent that finds a
  problem must log it there **and** call out the `X-id` in its new `docs/handoff/` file — do not report it
  only in chat.
- **Integration runs** at hours 8, 15, and 20. Start the API and web in tmux and walk T1 and T2
  through the real UI with the chips from their fixtures. The screen should show exactly what the
  fixture says at every step.
- **Checkpoints** are human decisions recorded in `docs/DECISIONS.md`:

| When | Decision |
|---|---|
| Hour 2 | Contract approved; CHANGE-001 accepted or rejected |
| Hour 6 | Model size, from A-03's measured p95, not its targets |
| Hour 8 | Does the product work end to end with no model? If not, nothing else starts |
| Hour 15 | Do the numbers hold up? If arm C ≈ arm B, the pitch changes (architecture §19.1) |
| Hour 20 | Weights frozen; the held-out set runs once and its result stands |

---

## 8. Quality gates

ECC's `verification-loop` distinguishes continuous checks from checkpoints. Here the gate is the
continuous check, run at step 5 of every loop, and the golden and contract suites are the
checkpoints that make the gate meaningful.

| Gate | Command | What it runs |
|---|---|---|
| A | `scripts/gate.sh a` | ruff; pytest, including property tests, golden traces against `reference_impl.py`, contract conformance of every API response, and the SQL behaviors from architecture §10.1; import-linter (`engine/` imports nothing from `api/`); the contract check |
| B | `scripts/gate.sh b` | `tsc --noEmit`; eslint; vitest, including rendering every step of every fixture; the contract check |
| Contract | `scripts/gate.sh contract` | Fixtures validate against the schema and still match `reference_impl.py` |

**On coverage.** ECC's `rules/common/testing.md` asks for 80% coverage. For a 24-hour build this kit
replaces line coverage with targeted gates: every property in architecture §6.2, every reference
case, and every §9 promise has a test. A hundred percent of the risky logic beats 80% of the lines.
`tc-00-project.mdc` states the override, so the agents don't chase coverage on UI code.

---

## 9. Project guardrails agents tend to break

These are architecture §9's promises, rewritten as instructions an agent can follow. They live in
`tc-00-project.mdc`, so they load in every chat.

- Never add an age, appearance, or name field anywhere.
- Never pass teller notes or any free text to a model.
- Never compute risk, levels, reasons, or the next question in `web/`. Render `SessionState`.
- Never disable an outcome button. All four stay available at every level.
- Never let the model emit prose. Its output is a question ID.
- Never let stated purpose touch the score or the displayed pattern.
- Never edit weights outside A-07, or golden expectations ever.
- Never write held-out scenarios in a chat or worktree that can see dev scenarios, weights, or
  results (§10).

---

## 10. Held-out isolation

Architecture §13.4 requires the held-out scenarios to be written "by whoever did not tune the
weights." With AI agents, the risk isn't a person but a **context window**. Any chat that has seen
the dev scenarios or the tuned weights can leak them into "held-out" scenarios without anyone
noticing. So B-07 runs in a fresh chat inside a worktree where the forbidden files don't exist:

```bash
git worktree add ../tc-heldout -b heldout weights-frozen
cd ../tc-heldout && rm -rf eval/scenarios/dev eval/results library/signals.yaml
# open in Cursor, new chat, paste prompts/B-07.md; tc-40-heldout.mdc applies
git add eval/scenarios/heldout && git commit -m "eval: held-out scenarios"
git restore .   # brings the deleted files back without committing their deletion
```

A rule can only *ask* an agent not to look; a missing file can't be looked at. R checks the commit
touches only `eval/scenarios/heldout/` before A-08 runs it.

---

## 11. Failure playbook

| Symptom | Response |
|---|---|
| Agent edits outside its directories | Revert the commit; tighten the rule's `globs`; restart the chat |
| Agent stuck for 20+ minutes | Fresh chat with the card and the newest `docs/handoff/` file; `build-error-resolver` for build failures |
| Golden test fails | Stop. Compare with `python reference_impl.py`. Log to `QUESTIONS.md`; a driver decides |
| B's screen disagrees with the real API at hour 8 | Diff the API response against the fixture; it's an A bug or a contract question |
| Contract conflict on merge | Stop both agents; R resolves on `main` through the change protocol |
| GPU down or model slow | `RECOMMENDER=rules` (architecture §14.2). The product is complete without the model by design |
| Agent proposes an "improvement" to the architecture | Log it to `QUESTIONS.md`. The document changes only by a driver's decision |

---

## 12. What's in the kit

```
WORKFLOW.md                     this document
docs/architecture.md            architecture v1.2 (read-only)
docs/HANDOFF.md                 pointer only; do not edit per PR. Template lives here
docs/handoff/                   one file per PR (`<yyyymmdd-hhmm>-<slug>.md`); list newest first. `000-archive.md` is the old log
docs/QUESTIONS.md               spec questions; agents log, drivers answer
docs/DECISIONS.md               checkpoint decisions (drivers only)
reference_impl.py               executable spec for architecture §6–§8 (read-only oracle)
.cursor/rules/tc-00-project.mdc         always on: mission, boundaries, guardrails, loop
.cursor/rules/tc-10-agent-a.mdc         auto-attached to backend paths
.cursor/rules/tc-20-agent-b.mdc         auto-attached to web/
.cursor/rules/tc-30-contract.mdc        auto-attached to contract/: stop, use the protocol
.cursor/rules/tc-40-heldout.mdc         manual: attach only in the held-out chat
prompts/P0-contract.md, A-01…A-08, B-01…B-07, J-01, R-review
contract/                       api.md, events.md, schemas, library sample, CHANGES.md, fixtures T1–T7
scripts/gate.sh                 quality gates a | b | contract
scripts/gen_fixtures.py         regenerates contract fixtures from reference_impl.py
scripts/check_contract.py       validates fixtures (no dependencies) and checks they're current
tests/golden/reference_weights.yaml   the weights golden tests use, so tuning can't break them
```
