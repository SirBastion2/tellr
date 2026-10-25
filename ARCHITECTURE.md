# Teller Copilot — one-page map

**Read this first.** Then open only the files it names. The spec is `docs/architecture.md` (v1.2); this file is a pointer, not a copy. Ownership is by directory (`docs/ROSTER.md` §3).

## Purpose

Teller Copilot is a teller-facing interview aid: it scores structured chips through a deterministic event-log fold and may ask a model only for the next question ID. Built in 24 hours by two humans and four agent lanes (A1 engine, A2 platform, A3 eval, B1 frontend) against a frozen A/B contract.

## Directories

| Path | Lane | Does | Key files |
|---|---|---|---|
| `engine/` | A1 | Fold, eligibility, stop, rules (§4–§8.4) | `__init__.py`, `reduce.py`, `score.py`, `eligibility.py`, `stop.py`, `rules.py`, `testing.py` |
| `library/` | A1 | YAML bank (patterns, questions, chips, signals) | `questions.yaml`, `signals.yaml`, `patterns.yaml`, `chips.yaml`, `purposes.yaml` |
| `tests/engine/` `tests/golden/` `tests/library/` | A1 | Properties, T1–T7 goldens, boot | `test_properties.py`, `test_traces.py`, `test_context_source.py`, `test_contributions.py`, `reference_weights.yaml` |
| `api/` | A2 | FastAPI turn order (§3, §11); J-01 `--replay` | `main.py`, `errors.py`, `replay.py`, `activity.py` |
| `api/replays/` | A2 | Practice replay logs (§14.2; web `--replay` `steps`) | `t1_legitimate.json`, `t3_coached.json` |
| `store/` | A2 | SQLite append-only log (§10.1) | `sqlite.py` |
| `recommenders/` | A2 | Model path: grammar, validator, LLMs (§7.4–§8) | `select.py`, `validate.py`, `grammar.py`, `local_llm.py`, `fake.py` |
| `tests/api/` `tests/store/` `tests/recommenders/` | A2 | Contract, store, §9 recommender tests, Windows live-path | `test_contract.py`, `test_sessions_list.py`, `test_warmup.py`, `test_x003_windows.py`, `test_replay_logs.py`, `test_cors.py`, `test_activity.py`, `test_post_context_source.py`, `test_explanation.py` |
| `eval/` except `heldout/` | A3 | Validator, 30 dev scenarios, harness (§13) | `validate.py`, `PREREGISTRATION.md`, `scenarios/dev/`, `run.py`, `arms/` |
| `eval/scenarios/heldout/` | H | Held-out set, written once (B-07) | created at hour 20 |
| `tests/eval/` | A3 | Scenario, validator, and harness tests | `test_validate.py`, `test_dev_scenarios.py`, `test_run.py` |
| `web/` | B1 | React UI, mock, screens, bank themes, simulated workstation (§12) | `src/App.tsx`, `src/screens/`, `src/theme/`, `src/demo/`, `src/presenter.tsx`, `src/workstation/`, `src/ui/`, `src/assets/tellr-wordmark.png`, `src/index.css`, `index.html`, `mock/live_levels.json`, `vite.config.ts`, `.env.api`, `src/devApi.ts` |
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
| `web/src/screens/HandoffScreen.tsx` | Outcome and actor come from the typed `GET /sessions/{id}/handoff` body (CHANGE-004). Layout is the fact-grid card in the workstation section. |
| `web/src/history.test.tsx` | Added. Practice rows stay off the default list and appear after the practice request. |
| `web/src/health.test.tsx` | Added. Health is a GET of `/health` with no recommender control and no `/settings` call. |
| `web/src/screens/SettingsScreen.tsx` | Removed. `/settings` redirects to `/health` (`web/src/App.tsx`). It is not in `web/src/routes.ts`. |
| `web/mock/replay.ts` | Also serves `GET /sessions` (live by default, `mode=practice`, `mode=all`) and `GET /health`. |
| `web/mock/plugin.ts` | Installed by `npm run dev`. Answers `/library`, `/health`, and `/sessions`. Not installed when `VITE_API_URL` is set. |

### `web/` themes

Bank chrome is one typed theme plus CSS variables. Screens still render server state only; they read tokens (`--tc-text`, `--tc-muted`, `--tc-input`, `--tc-accent`, `--tc-button`, `--tc-button-text`, `--tc-secondary-bg`, `--tc-secondary-fg`, `--tc-link`) and do not branch on the bank id. `?theme=<id>` selects a registered id and stores it in `localStorage` (`teller.theme`). An unknown id falls back to the stored id, then to `tellr`.

Each bank has a dark palette (the top-level color fields) and a `light` palette. The header toggle is Light / Dark / System, stored as `teller.colorScheme`. System follows `prefers-color-scheme` (dark when that query is missing). `web/index.html` sets `<meta name="color-scheme" content="light dark">` and `<meta name="darkreader-lock">`. `:root` sets `color-scheme: light dark`. The active scheme is also set on the theme root so form controls match. `forced-colors: active` uses system colors (`Canvas`, `ButtonFace`, `ButtonText`, `Highlight`) and keeps borders and focus; the level is still an icon plus a word. `prefers-contrast: more` thickens borders. Both palettes keep a solid `background.color` under the gradient.

| File | What it is |
|---|---|
| `web/src/theme/types.ts` | `BankTheme` plus `ThemePalette`. Dark colors sit on the theme. `light` is the other palette. Includes solid secondary, chip, action, and quote pairs. |
| `web/src/theme/chrome.ts` | Shared solid control colors so dismiss text does not inherit a risk-panel color. |
| `web/src/theme/palette.ts` | `darkPalette` and `themeForScheme`. Does not mutate the registered theme. |
| `web/src/theme/scheme.ts` | `light` / `dark` / `system`, and `readSystemScheme`. |
| `web/src/theme/tokens.ts` | Default id `tellr`, theme key, color-scheme key, presenter key, footer string, UI font. |
| `web/src/theme/resolve.ts` | `resolveThemeId` (query, then storage, then `tellr`). |
| `web/src/theme/registry.ts` | Loads every `web/src/theme/themes/*.ts`. Adding a bank is adding one file that exports `theme`. |
| `web/src/theme/themes/tellr.ts` | Base. Poppins, comfortable density, pill controls, navy-to-indigo gradient and a light indigo field. Logo in the header. Footer centered. |
| `web/src/theme/themes/mtb.ts` | M&T example. Segoe UI body, Georgia wordmark, regular density, round controls, green gradient plus `web/src/assets/weave.svg`, and a light green field. Footer bottom-right. |
| `web/src/theme/themes/fnb.ts` | F.N.B. Compact density, square corners, hard shadow, gold wordmark on the dark field, navy wordmark on the light field. |
| `web/src/theme/themes/pnc.ts` | PNC. Arial, comfortable density, medium radius, strong shadow. Orange `#EF7622` on slate-to-navy, and a warm light field. |
| `web/src/theme/vars.ts` | Maps a `BankTheme` onto the `--tc-*` custom properties. |
| `web/src/theme/ThemeProvider.tsx` | Reads `?theme=` and `localStorage`, resolves the color scheme, provides the theme. |
| `web/src/theme/ThemeRoot.tsx` | Full-bleed background with a solid color under the image. The card starts at the top of the page so the header is not clipped. No progress-dot column. |
| `web/src/theme/Wordmark.tsx` | Bank mark inside the app header. |
| `web/src/theme/controls.ts` | Shared control styles, including filled secondary and link styles. |
| `web/src/assets/tellr-wordmark.png` | Tellr wordmark (transparent). `mark: 'logo'` paints it with `--tc-logo` (periwinkle on the tellr dark theme). |
| `web/src/theme.test.tsx` | Selection, unknown-id fallback, storage, both palettes, and the flow layout. |
| `web/src/scheme.test.tsx` | Light/dark toggle, storage, and the color-scheme / forced-colors / contrast CSS. |
| `web/index.html` | Poppins, `color-scheme`, and `darkreader-lock`. |
| `web/src/themeContrast.test.ts` | WCAG AA for text, buttons, glass, links, badges, and clear/caution/high on every bank in light and dark. |

Page gradients are hex and rgba only. Windows Chrome and Edge drop an entire `background-image` when any layer is invalid. Explicit percentage ellipse radii (`ellipse 72% 58%`) were that invalid layer; Safari on Mac still painted the linear layer underneath. The keyword `transparent` is also avoided, because Chromium interpolates it as transparent black. Each palette sets a solid `background.color` as well as the image, and `index.css` swaps the card to `glass.fallback` when `backdrop-filter` is unsupported.

### `web/` workstation

Home is a teller workstation. A synthetic customer timeline plays beside a copilot card. The page card is `min(1440px, 100%)`. At 1280px and up the workstation is `3fr` / `2fr`. At 1024px the columns tighten. Below 900px they stack. The copilot card stretches to the column and stays sticky. Type and spacing use `clamp()`. The card reads the server level, the first reason or the counterpoint when reasons are empty, `question.text`, and `talk_track.lines`. It does not choose the next question, and it does not compute risk, level, reasons, or the next question.

CHANGE-005 fields are optional. `readExplanation` accepts `explanation` or `Explanation`, and `used_fallback` / `usedFallback`, `signal_id` / `signalId`. Contributions with `direction: "raises"` render under What raised it. `direction: "lowers"` render under What would lower it. There is no second contributions list. A strength word (Strong / Moderate / Minor factor) is the item's `|weight|` divided by the sum of `|weight|` in that response (`>= 1/3` strong, `>= 1/6` moderate, otherwise minor). The raw weight and any `sig.*` / `chip.*` id stay inside the collapsed Technical details. Confidence `null` reads "Not applicable (rules engine)". The gap sentence shows only when explanation is absent or null. Without an explanation, Clear puts `counterpoint` under What raised it and `reasons` under What would lower it, matching architecture §6.5. That is placement of server fields, not a new score.

`context_chips` source renders as Observed or Teller confirmed. Simulation posts send `source: "observed"`; manual context posts send `source: "teller"`. `GET /sessions/{id}/activity` fills the recent-activity table when it returns rows, with plain labels in the table and the raw ids in Technical details. Absent fields, mock mode, and T1–T7 fixtures keep working. Confirm still marks a chip locally and does not post it again. Dismiss undoes back to that chip and reposts the rest with the same source. Escalate records outcome `escalate` with actor `teller` and opens handoff. The two-tap opener on Session stays: purpose chip, then answer chips.

Every screen uses a two-column fact grid: bold labels, normal values, bold section headings. Handoff is a card titled from the recorded outcome (`Handoff — Escalated by teller` when the teller escalated). The level is an icon plus a word. A UUID session id shows its first eight characters, with the full id on the tooltip and the copy button. Suggested outcome and the teller's decision are separate rows.

The header is one row: bank mark, title, status pill, tabs, Light/Dark/System, Presenter, and `?`. It does not wrap. The nav scrolls. Under a 1120px header, the theme segment collapses into a menu. The pill says `Simulation: <customer title>` while a synthetic customer is selected, and `LIVE — no scenario loaded` for a live session with no simulation. Undo sits with the signal list on the workstation only. Dev tabs stay available unless presenter mode is on. The header and the page body have a normal gap (`tc-shell`), so the Workstation heading and the Outcome card do not sit against the header.

The toolbar controls share a 40px height. Play keeps the icon and the word on one line. The customer select matches that height. Show case file sits on the same row. The elapsed timer is always on that row.

Playback length at 1× is the sum of each event's `delayMs`. 2× halves it and 4× quarters it. Reduced motion uses a 0 wait. Targets: routine Friday 20s, car down payment 32s, government impersonation and romance/crypto 45s, contractor cash 60s. Timeline rows show step, elapsed time, and speaker, and bold amounts and phrases such as "on the phone" and "cash".

Presenter mode is the header toggle or `?present=1` (stored in `teller.presenter` when toggled). It hides Context, Session, History, and Health; sets the root font size to 125%; resets the session when the customer changes; enlarges the current-event caption; and keeps only play/pause (`P`) and step (`N`).

| File | What it is |
|---|---|
| `web/src/demo/customers.ts` | Five synthetic files and `SCRIPT_TARGETS_MS`. The last two post no chips. Name and age band are display-only. Activity rows have date, description, and amount for the customer-file table. |
| `web/src/demo/clock.ts` | `m:ss` elapsed label. |
| `web/src/presenter.tsx` | Presenter flag from `?present=` or `localStorage`. |
| `web/src/screens/HomeScreen.tsx` | Toolbar, transaction panel, copilot card, explanation. |
| `web/src/screens/CustomerFileScreen.tsx` | Profile, activity table, this withdrawal, and what was noted. No Undo. Session activity replaces the synthetic table when `GET /activity` returns rows, and dismissed chips stay in that table. Source badges prefer `context_chips` and otherwise stay Not yet, Observed, Teller confirmed, or Dismissed. |
| `web/src/screens/HandoffScreen.tsx` | Handoff card. Fact grid, level badge, flagged list from the final SessionState chips (reasons when chips are absent), with dismissed/confirmed marks when that data is in state. |
| `web/src/ui/facts.tsx` | Bold-label fact grid and section headings shared by the screens. |
| `web/src/ui/plain.ts` | Teller-facing labels: pattern, mode, outcome, short id, amount band, recommender phrase. |
| `web/src/ui/emphasis.tsx` | Bolds amounts and phrases such as "on the phone" in timeline copy. |
| `web/src/workstation/Toolbar.tsx` | 40px customer picker, Play/Pause, Step, Restart, speed segments, timer, case-file link. |
| `web/src/workstation/CopilotStrip.tsx` | Sticky card that fills the column. Level icon and word, one reason, suggested action, collapsible read-aloud quote, noted rows with badges and icon buttons. Dismissed rows stay in first-seen order and offer Restore. Undo lives here. |
| `web/src/feed.ts` | Chip order, activity memory, source badges, and the handoff flagged list. Display only; no risk math. |
| `web/src/feed.test.ts` | Stable chip order, dismissed activity rows, and handoff chip listing. |
| `web/src/workstation/explain.ts` | Reads `explanation` and groups raises and lowers. Strength words from the response's own weights. |
| `web/src/workstation/ExplanationPanel.tsx` | Why this level. Fact grid, two contribution lists, noted items, collapsed technical details. |
| `web/src/workstation/TransactionPanel.tsx` | Key-value transaction, timeline with step and speaker, event progress. Session activity appears when `GET /activity` returns rows. |
| `web/src/ui/ShortcutHelp.tsx` | `?` lists keyboard shortcuts in a two-column grid so `[` and `]` align with the other keys. Presenter mode notes the reduced set. |
| `web/src/ui/icons.tsx` | Play, pause, step, restart, confirm, and dismiss icons. |
| `web/src/ui/ConfirmDialog.tsx` | Confirm before restart, customer switch (off in presenter mode), and escalate. |
| `web/src/presenter.test.tsx` | Presenter query, hidden dev tabs, type size, and customer switch without a confirm dialog. |
| `web/mock/live_levels.json` | Recorded engine responses for context-chip subsets. The mock uses these when a live post is not the next fixture step. Answers on that path are scored by the real API (`npm run dev:api`). The mock echoes `context_chips` from the live log and serves `GET /activity`. It leaves `explanation` off unless the recorded body already has it. |
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
