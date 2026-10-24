# Teller Copilot — one-page map

**Read this first.** Then open only the files it names. The spec is `docs/architecture.md` (v1.2); this file is a pointer, not a copy. Ownership is by directory (`docs/ROSTER.md` §3).

## Purpose

Teller Copilot is a teller-facing interview aid: it scores structured chips through a deterministic event-log fold and may ask a model only for the next question ID. Built in 24 hours by two humans and four agent lanes (A1 engine, A2 platform, A3 eval, B1 frontend) against a frozen A/B contract.

## Directories

| Path | Lane | Does | Key files |
|---|---|---|---|
| `engine/` | A1 | Fold, eligibility, stop, rules (§4–§8.4) | `__init__.py`, `reduce.py`, `score.py`, `eligibility.py`, `stop.py`, `rules.py`, `testing.py` |
| `library/` | A1 | YAML bank (patterns, questions, chips, signals) | `questions.yaml`, `signals.yaml`, `patterns.yaml`, `chips.yaml`, `purposes.yaml` |
| `tests/engine/` `tests/golden/` `tests/library/` | A1 | Properties, T1–T7 goldens, boot | `test_properties.py`, `test_traces.py`, `reference_weights.yaml` |
| `api/` | A2 | FastAPI turn order (§3, §11) | `main.py`, `errors.py` |
| `store/` | A2 | SQLite append-only log (§10.1) | `sqlite.py` |
| `recommenders/` | A2 | Model path: grammar, validator, LLMs (§7.4–§8) | `select.py`, `validate.py`, `grammar.py`, `local_llm.py` |
| `tests/api/` `tests/store/` `tests/recommenders/` | A2 | Contract, store, §9 recommender tests, Windows live-path | `test_contract.py`, `test_warmup.py`, `test_x003_windows.py` |
| `eval/` except `heldout/` | A3 | Validator, 30 dev scenarios, harness (§13) | `validate.py`, `PREREGISTRATION.md`, `scenarios/dev/`, `run.py`, `arms/` |
| `eval/scenarios/heldout/` | H | Held-out set, written once (B-07) | created at hour 20 |
| `tests/eval/` | A3 | Scenario, validator, and harness tests | `test_validate.py`, `test_dev_scenarios.py`, `test_run.py` |
| `web/` | B1 | React UI, mock, screens (§12) | `src/App.tsx`, `src/screens/`, `src/index.css`, `src/a11y.test.tsx`, `src/history.test.tsx`, `src/health.test.tsx`, `mock/`, `src/talkTrack.test.tsx`, `src/undo.test.tsx`, `src/modes.test.tsx` |
| `web/src/screens/history/` `…/settings/` `web/e2e/` | B2 | Leaf screens + e2e if added at hour 8. Not created. B-06 filled history and health in `web/src/screens/` | — |
| `contract/` | — | Frozen A/B interface | `api.md`, `*.schema.json`, `fixtures/T1–T7.json`, `CHANGES.md` |
| `prompts/` | — | Task cards (see below) | `A-01`–`A-08`, `B-01`–`B-07`, `P0-contract`, `R-review`, `J-01` |
| `docs/` | mixed | Spec and logs (see below) | `architecture.md`, `ROSTER.md`, `HANDOFF.md`, `CP3_GPU_RUN.md` |
| `scripts/` | A2* | Gates; A2 owns `bench_*` + `with-gpu` | `gate.sh`, `with-gpu`, `bench_llm.py`, `check_contract.py` |
| `reference_impl.py` | — | Executable spec of §6–§8 | never edit |
| `WORKFLOW.md` | — | How the build is run | §3 loop, §5 contract, §8 gates |
| `ARCHITECTURE.md` | all | This map | update in the same PR that moves files |
| root config | A2 | Python project + import rules | `pyproject.toml`, `Makefile`, `.importlinter`, `tests/conftest.py` |

### `web/` after B-06

History and the read-only recommender view live in the existing screen files. There is no Settings screen.

| File | What it is |
|---|---|
| `web/src/screens/HistoryScreen.tsx` | `GET /sessions` (live only). Practice is a second request, `GET /sessions?mode=practice`. Renders `session_id`, `mode`, `opened_at`, `closed_at`, `library_version`. |
| `web/src/screens/HealthScreen.tsx` | `GET /health` only. Shows recommender, model id, p50, p95, last p95, fallback rate, rejection count, agreement rate. The recommender follows process config from startup. |
| `web/src/screens/HandoffScreen.tsx` | Unchanged. Outcome and actor come from the typed `GET /sessions/{id}/handoff` body (CHANGE-004). |
| `web/src/history.test.tsx` | Added. Practice rows stay off the default list and appear after the practice request. |
| `web/src/health.test.tsx` | Added. Health is a GET of `/health` with no recommender control and no `/settings` call. |
| `web/src/screens/SettingsScreen.tsx` | Removed. `/settings` redirects to `/health` (`web/src/App.tsx`). It is not in `web/src/routes.ts`. |
| `web/mock/replay.ts` | Also serves `GET /sessions` (live by default, `mode=practice`, `mode=all`) and `GET /health`. |
| `web/mock/plugin.ts` | Dev server forwards `/health` to that mock. |

## Task cards (`prompts/`)

| Lane | Cards |
|---|---|
| A1 | `A-01` (library half), `A-02`, `A-04` (engine half), `A-07` (weights) |
| A2 | `A-01` (platform half), `A-03`, `A-04` (API half), `A-05`, `J-01` |
| A3 | `A-06`, `A-08` |
| B1 | `B-01`–`B-06` (`B-06` moves to B2 if B2 exists) |
| H | `B-07` (held-out; isolated worktree, `WORKFLOW.md` §10) |
| R | `R-review`, `P0-contract` |

## Which doc for which question

| Question | Open |
|---|---|
| Who owns a path; hour-by-hour plan | `docs/ROSTER.md` §3–§6 |
| How to run a card, merge, change the contract | `WORKFLOW.md` §3, §5, §7–§8 |
| Scoring, fold, domain, eligibility, stop | `docs/architecture.md` §4–§8 |
| Safety / fairness promises | `docs/architecture.md` §9 |
| API / SessionState | `docs/architecture.md` §11; `contract/api.md` |
| Frontend screens | `docs/architecture.md` §12 |
| Eval, scenarios, metrics | `docs/architecture.md` §13 |
| Storage, demo, fallbacks | `docs/architecture.md` §10, §14 |
| Driver decisions already made | `docs/DECISIONS.md` |
| Spec ambiguity (do not improvise) | `docs/QUESTIONS.md` |
| Problem in the other lane (log, don't fix) | `docs/CROSS_LANE.md` |
| A↔B status | `docs/A_TO_B.md` / `docs/B_TO_A.md` (newest first) |
| What the last card shipped | `docs/HANDOFF.md` (append-only) |
| GPU arm-C / CP3 run (Driver B laptop) | `docs/CP3_GPU_RUN.md` (on hold until B reports GPU access) |

**`docs/architecture.md` section index** (cite; do not copy): §0 how to read · §1 drivers · §2 key decisions · §3 system overview · §4 event log/reducer · §5 domain model · §6 risk scoring · §7 question selection · §8 reasoning layer · §9 safety · §10 data/privacy · §11 API · §12 frontend · §13 eval · §14 demo · §15 deploy · §16 observability · §17 24-hour plan · §18 draft issues · §19 open questions.

## Gates

```
scripts/gate.sh a         # ruff, pytest, import-linter, contract
scripts/gate.sh b         # web typecheck, lint, test, contract
scripts/gate.sh contract  # fixtures + schemas vs reference_impl.py
```
Model-dependent jobs run through `scripts/with-gpu`.

## Never touch

Without the protocol in `WORKFLOW.md` §5 / `docs/ROSTER.md` §3: `docs/architecture.md`, `contract/`, `reference_impl.py`, `tests/golden/reference_weights.yaml`. Do not edit another lane's directories. Do not add age/appearance/name fields; send teller notes or free text to a model; compute risk, level, reasons, or the next question in `web/`; disable an outcome button; let the model emit prose; let stated purpose affect the score or displayed pattern; edit weights outside A-07, or golden expectations ever; write held-out scenarios where `eval/scenarios/dev/`, weights, or results are visible.

## Keeping this map current

Any PR that adds, removes, or moves a file or directory must update `ARCHITECTURE.md` in the same PR. Agents read this file first and open only the files it points to.
