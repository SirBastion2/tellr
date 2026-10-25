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
| `api/` | A2 | FastAPI turn order (§3, §11); J-01 `--replay` | `main.py`, `errors.py`, `replay.py` |
| `api/replays/` | A2 | Practice replay logs (§14.2; web `--replay` `steps`) | `t1_legitimate.json`, `t3_coached.json` |
| `store/` | A2 | SQLite append-only log (§10.1) | `sqlite.py` |
| `recommenders/` | A2 | Model path: grammar, validator, LLMs (§7.4–§8) | `select.py`, `validate.py`, `grammar.py`, `local_llm.py`, `fake.py` |
| `tests/api/` `tests/store/` `tests/recommenders/` | A2 | Contract, store, §9 recommender tests, Windows live-path | `test_contract.py`, `test_sessions_list.py`, `test_warmup.py`, `test_x003_windows.py`, `test_replay_logs.py`, `test_cors.py` |
| `eval/` except `heldout/` | A3 | Validator, 30 dev scenarios, harness (§13) | `validate.py`, `PREREGISTRATION.md`, `scenarios/dev/`, `run.py`, `arms/` |
| `eval/scenarios/heldout/` | H | Held-out set, written once (B-07) | created at hour 20 |
| `tests/eval/` | A3 | Scenario, validator, and harness tests | `test_validate.py`, `test_dev_scenarios.py`, `test_run.py` |
| `web/` | B1 | React UI, mock, screens, bank themes, simulated workstation (§12) | `src/App.tsx`, `src/screens/`, `src/theme/`, `src/demo/`, `src/workstation/`, `src/ui/`, `src/assets/tellr-wordmark.png`, `src/index.css`, `mock/live_levels.json`, `vite.config.ts`, `.env.api`, `src/devApi.ts` |
| `web/src/screens/history/` `…/settings/` `web/e2e/` | B2 | Leaf screens + e2e if added at hour 8. Not created. B-06 filled history and health in `web/src/screens/` | — |
| `contract/` | — | Frozen A/B interface | `api.md`, `*.schema.json` (incl. `activity.schema.json`, CHANGE-005), `fixtures/T1–T7.json`, `CHANGES.md` |
| `prompts/` | — | Task cards (see below) | `A-01`–`A-08`, `B-01`–`B-07`, `P0-contract`, `R-review`, `J-01` |
| `docs/` | mixed | Spec and logs (see below) | `architecture.md`, `ROSTER.md`, `HANDOFF.md`, `CP3_GPU_RUN.md`, `A08_HELDOUT_RUN.md`, `WRITEUP_NUMBERS.md` |
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
| `web/mock/plugin.ts` | Installed by `npm run dev`. Answers `/library`, `/health`, and `/sessions`. Not installed when `VITE_API_URL` is set. |

### `web/` themes

Bank chrome is one typed theme plus CSS variables. Screens still render server state only; they read tokens (`--tc-text`, `--tc-muted`, `--tc-input`, `--tc-accent`, `--tc-button`, `--tc-button-text`) and do not branch on the bank id. `?theme=<id>` selects a registered id and stores it in `localStorage` (`teller.theme`). An unknown id falls back to the stored id, then to `tellr`.

| File | What it is |
|---|---|
| `web/src/theme/types.ts` | `BankTheme`: name, wordmark, logo treatment, placement, footer, font family and weights, wordmark styling, radius, border, shadow, density, spacing, background, glass fill/border/blur plus an opaque fallback, text, muted text, input, accent, button, progress dots, and solid risk colors. |
| `web/src/theme/tokens.ts` | Default id `tellr`, storage key, footer string, UI font. |
| `web/src/theme/resolve.ts` | `resolveThemeId` (query, then storage, then `tellr`). |
| `web/src/theme/registry.ts` | Loads every `web/src/theme/themes/*.ts`. Adding a bank is adding one file that exports `theme`. |
| `web/src/theme/themes/tellr.ts` | Base. Poppins, comfortable density, pill controls, navy-to-indigo gradient, frosted glass, logo top-left, footer centered. |
| `web/src/theme/themes/mtb.ts` | M&T example. Segoe UI body, Georgia wordmark, regular density, round controls, green gradient plus `web/src/assets/weave.svg`, text wordmark bottom-left, footer bottom-right. |
| `web/src/theme/themes/fnb.ts` | F.N.B. Compact density, square corners, hard shadow, gold wordmark, light-blue accent. Text wordmark, no logo file. |
| `web/src/theme/themes/pnc.ts` | PNC. Arial, comfortable density, medium radius, strong shadow. Orange `#EF7622` on slate `#4D5964` to navy `#002D72`. Text wordmark, no logo file. |
| `web/src/theme/vars.ts` | Maps a `BankTheme` onto the `--tc-*` custom properties. |
| `web/src/theme/ThemeProvider.tsx` | Reads `?theme=` and `localStorage`, provides the theme. |
| `web/src/theme/ThemeRoot.tsx` | Full-bleed background, glass card, wordmark, footer, progress dots. Dots show `session.answers` from the server. |
| `web/src/theme/controls.ts` | Shared control styles that point at those variables. |
| `web/src/assets/tellr-wordmark.png` | Tellr wordmark (transparent). `mark: 'logo'` paints it with `--tc-logo` (periwinkle on the tellr theme). |
| `web/src/theme.test.tsx` | Selection, unknown-id fallback, storage, and the registered theme objects. |
| `web/index.html` | Loads Poppins for the tellr theme. Other banks set their own font stacks on the theme object. |
| `web/src/themeContrast.test.ts` | WCAG AA contrast for text, buttons, glass, and clear/caution/high on every registered theme. |

Page gradients are hex and rgba only. Windows Chrome and Edge drop an entire `background-image` when any layer is invalid. Explicit percentage ellipse radii (`ellipse 72% 58%`) were that invalid layer; Safari on Mac still painted the linear layer underneath. The keyword `transparent` is also avoided, because Chromium interpolates it as transparent black. Each theme sets a solid `background.color` as well as the image, and `index.css` swaps the card to `glass.fallback` when `backdrop-filter` is unsupported.

### `web/` workstation

Home is a teller workstation. A synthetic customer timeline plays beside a copilot strip. The strip reads the server level, the first reason, `question.text`, and `talk_track.lines`. It does not choose the next question. Confirm marks a posted chip locally. Dismiss undoes back to that chip and reposts the rest. Escalate records outcome `escalate` with actor `teller` and opens handoff. The two-tap opener on Session stays: purpose chip, then answer chips.

| File | What it is |
|---|---|
| `web/src/demo/customers.ts` | Five synthetic files: contractor cash, romance/crypto, government impersonation, car down payment, routine Friday cash. The last two post no chips. Name and age band are display-only. |
| `web/src/screens/HomeScreen.tsx` | Play, pause, step, restart, speed, customer picker, case file toggle, transaction panel, copilot strip, explanation. |
| `web/src/screens/CustomerFileScreen.tsx` | Profile, recent activity, the live transaction, and whether each scripted signal is not yet posted, auto-detected, teller-confirmed, or dismissed. |
| `web/src/workstation/CopilotStrip.tsx` | Quiet strip. Clear, caution, and high each have an icon and a word. One suggested action and the read-aloud script from the response. |
| `web/src/workstation/ExplanationPanel.tsx` | Why this level, from the session response plus posted chip labels. Names the fields the response does not include. |
| `web/src/workstation/TransactionPanel.tsx` | Mock core-banking transaction and the events that have already fired. |
| `web/src/ui/ShortcutHelp.tsx` | `?` lists keyboard shortcuts. |
| `web/src/ui/ConfirmDialog.tsx` | Confirm before restart, customer switch, and escalate. |
| `web/mock/live_levels.json` | Recorded engine responses for context-chip subsets. The mock uses these when a live post is not the next fixture step. Answers on that path are scored by the real API (`npm run dev:api`). |
| `web/src/routes.ts` | Nav labels are Home, Customer file, Context, Session, Outcome, Handoff, History, Health. |

### `web/` dev modes

Two local runs. Neither script starts the API. `web/src/api.ts` keeps `apiBase()` as `import.meta.env.VITE_API_URL ?? ''`, so a set value is the request origin and an unset value stays on the Vite origin.

Real-API mode uses the CORS middleware from #71, merged at `6d063eb` (8:24 PM ET). `api/main.py` allows any origin and sends no credentials, so a page on `http://127.0.0.1:5173` can call `http://127.0.0.1:8000`. That merge needed no further `web/` edits. Restart uvicorn if it was started before the pull.

| File | What it is |
|---|---|
| `web/package.json` | `dev` is `vite` (mock). `dev:api` is `vite --mode api`. The script has no `VAR=value` prefix, so Windows PowerShell can run it. |
| `web/.env.api` | Loaded only for mode `api`. Sets `VITE_API_URL=http://127.0.0.1:8000`. |
| `web/vite.config.ts` | Reads `VITE_API_URL` with `loadEnv`. A non-empty value skips `mockApiPlugin`. |
| `web/src/devApi.ts` | `useMockApi` (mock only when the URL is blank) and `directoryFromFileUrl` (config directory, including `C:/...`). |
| `web/src/devApi.test.ts` | Scripts, `.env.api`, and mock on/off. |
| `web/src/api.ts` | Unchanged. Sends browser requests to `VITE_API_URL` when it is set. |
| `web/.gitignore` | Ignores `.env.local` and `.env.*.local` so a machine can override the origin. |

Windows PowerShell, from the repo:

Mock (default). Same data as before. `VITE_API_URL` stays unset, and the mock plugin answers `/library`, `/health`, and `/sessions`.

```
cd web
npm run dev
```

Real API. Start the API on port 8000 from current main (`python -m uvicorn api.main:app --port 8000`). Then:

```
cd web
npm run dev:api
```

The browser calls `http://127.0.0.1:8000`. The mock plugin is not installed, so it cannot answer those paths.

To point at another origin, set the variable in that PowerShell window and then start the script:

```
$env:VITE_API_URL = "http://127.0.0.1:9000"
npm run dev:api
```

Or put `VITE_API_URL=http://127.0.0.1:9000` in `web/.env.api.local`. A set `VITE_API_URL` also turns the mock off for `npm run dev`.

## Task cards (`prompts/`)

| Lane | Cards |
|---|---|
| A1 | `A-01` (library half), `A-02`, `A-04` (engine half), `A-07` (weights) |
| A2 | `A-01` (platform half), `A-03`, `A-04` (API half), `A-05`, `J-01` |
| A3 | `A-06`, `A-08`, `J-01` (writeup numbers) |
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
| GPU arm-C / CP3 run (Driver B laptop) | `docs/CP3_GPU_RUN.md` |
| A-08 held-out run (Driver B GPU laptop, once) | `docs/A08_HELDOUT_RUN.md` |
| Writeup counts (J-01 steps 3–4) | `docs/WRITEUP_NUMBERS.md` |

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
