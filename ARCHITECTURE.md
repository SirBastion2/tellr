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
| `api/` | A2 | FastAPI turn order (§3, §11); J-01 `--replay` | `main.py`, `errors.py`, `replay.py`, `activity.py`, `time.py` |
| `api/replays/` | A2 | Practice replay logs (§14.2; web `--replay` `steps`) | `t1_legitimate.json`, `t3_coached.json` |
| `store/` | A2 | SQLite append-only log (§10.1) | `sqlite.py` |
| `recommenders/` | A2 | Model path: grammar, validator, LLMs (§7.4–§8) | `select.py`, `validate.py`, `grammar.py`, `local_llm.py`, `fake.py` |
| `tests/api/` `tests/store/` `tests/recommenders/` | A2 | Contract, store, §9 recommender tests, Windows live-path | `test_contract.py`, `test_sessions_list.py`, `test_warmup.py`, `test_x003_windows.py`, `test_replay_logs.py`, `test_cors.py`, `test_activity.py`, `test_post_context_source.py`, `test_explanation.py`, `test_local_hour.py` |
| `eval/` except `heldout/` | A3 | Validator, 30 dev scenarios, harness (§13) | `validate.py`, `PREREGISTRATION.md`, `scenarios/dev/`, `run.py`, `arms/` |
| `eval/scenarios/heldout/` | H | Held-out set, written once (B-07) | created at hour 20 |
| `tests/eval/` | A3 | Scenario, validator, and harness tests | `test_validate.py`, `test_dev_scenarios.py`, `test_run.py` |
| `web/` | B1 | React UI, mock, screens, bank themes, simulated workstation (§12) | `src/App.tsx`, `src/LiveBadge.tsx`, `src/screens/`, `src/theme/` (incl. `typeScale.ts`), `src/demo/`, `src/presenter.tsx`, `src/workstation/`, `src/ui/`, `src/assets/tellr-wordmark.png`, `src/index.css`, `index.html`, `public/favicon.svg`, `mock/live_levels.json`, `mock/live_answers.json`, `vite.config.ts`, `.env.api`, `src/devApi.ts` |
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
| `web/src/screens/HistoryScreen.tsx` | `GET /sessions` (live only). Practice is a second request, `GET /sessions?mode=practice`. Renders `session_id`, `mode`, local `opened_at` / `closed_at`, `library_version`. |
| `web/src/screens/HealthScreen.tsx` | `GET /health` only. Shows recommender, model id, p50, p95, last p95, fallback rate, rejection count, agreement rate. The recommender follows process config from startup. |
| `web/src/screens/HandoffScreen.tsx` | Outcome and actor come from the typed `GET /sessions/{id}/handoff` body (CHANGE-004). Layout is the fact-grid card in the workstation section. |
| `web/src/history.test.tsx` | Added. Practice rows stay off the default list and appear after the practice request. |
| `web/src/health.test.tsx` | Added. Health is a GET of `/health` with no recommender control and no `/settings` call. |
| `web/src/screens/SettingsScreen.tsx` | Removed. `/settings` redirects to `/health` (`web/src/App.tsx`). It is not in `web/src/routes.ts`. |
| `web/src/screens/NotFoundScreen.tsx` | Catch-all and session routes with no visit. Link back to Home. |
| `web/mock/replay.ts` | Also serves `GET /sessions` (live by default, `mode=practice`, `mode=all`) and `GET /health`. Live answers look up `live_answers.json`. |
| `web/mock/plugin.ts` | Installed by `npm run dev`. Answers `/library`, `/health`, and `/sessions`. Not installed when `VITE_API_URL` is set. |

### `web/` themes

Bank chrome is one typed theme plus CSS variables. Screens still render server state only; they read tokens (`--tc-text`, `--tc-muted`, `--tc-input`, `--tc-accent`, `--tc-button`, `--tc-button-text`, `--tc-secondary-bg`, `--tc-secondary-fg`, `--tc-link`, `--tc-highlight`, `--tc-highlight-fg`, `--tc-text-xs`…`--tc-text-2xl`) and do not branch on the bank id. `?theme=<id>` selects a registered id and stores it in `localStorage` (`teller.theme`). An unknown id falls back to the stored id, then to `tellr`. A missing query is always `tellr` so a leftover `teller.theme` does not surprise the demo. `T` cycles `THEME_IDS` in order `tellr` → `pnc` → `mtb` → `fnb` → `tellr` without reloading. Storage is still written when a valid query or `T` selects a bank.

Each bank has a dark palette (the top-level color fields) and a `light` palette. The header toggle is Light / Dark / System, stored as `teller.colorScheme`. System follows `prefers-color-scheme` (dark when that query is missing). `web/index.html` sets `<meta name="color-scheme" content="light dark">` and `<meta name="darkreader-lock">`. `:root` sets `color-scheme: light dark`. The active scheme is also set on the theme root and on every `<select>` (`color-scheme: dark` or `light`, matching `data-scheme` / `data-color-scheme`) so Windows Chrome and Edge paint a dark option list in dark mode, including System after it resolves. Option rows use `--tc-surface` and `--tc-text`. Hover, focus, and selected rows use `--tc-button` and `--tc-button-text`. Those fills are opaque and meet WCAG AA. `prefers-contrast: more` keeps those pairs and thickens borders. `forced-colors: active` uses system colors (`Canvas`, `ButtonFace`, `ButtonText`, `Field`, `FieldText`, `Highlight`, `HighlightText`) and keeps borders and focus; the level is still an icon plus a word. Both palettes keep a solid `background.color` under the gradient.

| File | What it is |
|---|---|
| `web/src/theme/types.ts` | `BankTheme` plus `ThemePalette`. Dark colors sit on the theme. `light` is the other palette. Includes solid secondary, chip, action, quote, and suggested-outcome highlight pairs. Radius, heights, padding, weights, and blur are not on the bank object. |
| `web/src/theme/chrome.ts` | Light `SOLID_CONTROLS` and dark `DARK_CONTROLS` plus `DARK_RISK`. Nested action, quote, chip, and secondary pairs follow the active scheme. |
| `web/src/theme/palette.ts` | `darkPalette` and `themeForScheme`. Does not mutate the registered theme. |
| `web/src/theme/scheme.ts` | `light` / `dark` / `system`, `readSystemScheme`, and `useSchemeCompact` so the header mounts the segment or the menu, not both. |
| `web/src/theme/typeScale.ts` | Shared type scale. Only file with raw font-size values. Steps `--tc-text-xs/sm/base/lg/xl/2xl` plus fixed line-heights, weights, kicker tracking/transform, `font-size-adjust` 0.52 (Arial x-height on every bank), demo `html` 105%, and `--tc-line-fact` (`TYPE_SIZE.base`) for fact-row line boxes. Role aliases keep `--tc-type-*` on the same steps. |
| `web/src/theme/tokens.ts` | Default id `tellr`, theme key, color-scheme key, presenter key, footer string, UI font, workstation `DENSITY` (shared structure: pill control `999px`, card `16px`, control/header height `48px`, type roles from `typeScale.ts`, `lineFact` = `TYPE_SIZE.base`, pill, stable sim/connection pill widths, Play/timer/speed mins, shared `spaceGap` 12px, focus clip, 4/8/12/16/24 rhythm, demo root 105%). |
| `web/src/theme/resolve.ts` | `resolveThemeId` (known query, then stored only for an unknown query, then `tellr`). |
| `web/src/theme/registry.ts` | Loads every `web/src/theme/themes/*.ts`. `THEME_IDS` / `THEME_LIST` are `tellr`, `pnc`, `mtb`, `fnb`. `cycleThemeId` is the `T` order. Adding a bank is adding one file that exports `theme`. |
| `web/src/theme/themes/tellr.ts` | Base. Poppins, navy-to-indigo gradient and a light indigo field. Logo in the header. Footer centered. Structure tokens are shared; only color, font family, and the brand mark differ. |
| `web/src/theme/themes/mtb.ts` | M&T example. Segoe UI body, Georgia wordmark, green gradient plus `web/src/assets/weave.svg`, and a light green field. Footer bottom-right. Same shared pill/card radii as the other banks. |
| `web/src/theme/themes/fnb.ts` | F.N.B. Gold wordmark on the dark field, navy wordmark on the light field. Rectangular radius overrides removed; uses the shared pill control token. |
| `web/src/theme/themes/pnc.ts` | PNC. Arial. Orange `#EF7622` on slate-to-navy, and a warm light field. Rectangular radius overrides removed; uses the shared pill control token. |
| `web/src/theme/vars.ts` | Maps a `BankTheme` onto the `--tc-*` custom properties. Type tokens come from `typeScale.ts`. Other structural vars (`--tc-radius-*`, heights, gap) come from `DENSITY`. `SHARED_STRUCTURE_VARS` is the identity list. |
| `web/src/theme/ThemeProvider.tsx` | Reads `?theme=` and `localStorage`, resolves the color scheme, provides the theme. `useThemeActions` cycles the bank in place. |
| `web/src/theme/ThemeRoot.tsx` | Full-bleed background with a solid color under the image. The card fills the padded page so a wide screen does not letterbox a 1440px column. The page uses `overflow-x: clip` plus clip-margin so focus rings stay visible. No progress-dot column. Footer uses `--tc-text-xs`. Theme-root font-size is 100% so rem tokens do not double-scale under the 105% `html` root. |
| `web/src/theme/Wordmark.tsx` | Bank mark inside the app header. The tellr logo is flex-centered in the shared 48px header-control pill (`object-fit: contain`, height-driven 155 / 61). |
| `web/src/theme/controls.ts` | Shared control styles, including filled secondary and link styles. |
| `web/src/assets/tellr-wordmark.png` | Tellr wordmark (transparent, 155×61, tight crop). `mark: 'logo'` paints it with `--tc-logo` (periwinkle on the tellr dark theme). Height drives width. |
| `web/src/theme.test.tsx` | Selection, unknown-id fallback, storage, both palettes, and the flow layout. |
| `web/src/themeConsistency.test.tsx` | Shared gap, shared pill type, per-bank highlight, exclusive scheme control, theme-page clip, identical radius / header / type tokens, and even header-tab fill across tellr / pnc / mtb / fnb. |
| `web/src/typeScale.test.tsx` | All four banks resolve the same `--tc-text-*` tokens. Static check: no raw `font-size` / `fontSize` outside `web/src/theme/typeScale.ts`. |
| `web/src/themeCycle.test.tsx` | `T` cycles all four banks and wraps, default `tellr`, Customer file route, ignore-in-inputs, and a header / Urgency Score / copilot render per theme in light and dark. |
| `web/src/scheme.test.tsx` | Light/dark/system toggle, storage, native select popup tokens, and the color-scheme / forced-colors / contrast CSS. |
| `web/index.html` | Poppins, `color-scheme`, `darkreader-lock`, and `/favicon.svg`. |
| `web/public/favicon.svg` | Small app icon (navy tile, clear-level mark). |
| `web/src/favicon.test.ts` | `index.html` links `public/favicon.svg`. |
| `web/src/themeContrast.test.ts` | WCAG AA for text, buttons, glass, links, badges, select options (surface/text and button/button-text), clear/caution/high, and suggested-outcome highlight on every bank in light and dark. |
| `web/src/copilotTheme.test.tsx` | Dark copilot uses surface/text; level badge keeps risk colors; quote/action/chip follow Light/Dark. |

Page gradients are hex and rgba only. Windows Chrome and Edge drop an entire `background-image` when any layer is invalid. Explicit percentage ellipse radii (`ellipse 72% 58%`) were that invalid layer; Safari on Mac still painted the linear layer underneath. The keyword `transparent` is also avoided, because Chromium interpolates it as transparent black. Each palette sets a solid `background.color` as well as the image, and `index.css` swaps the card to `glass.fallback` when `backdrop-filter` is unsupported.

### `web/` workstation

Home is a teller workstation. A synthetic customer timeline plays beside a copilot card. The page card fills the padded page (`width: 100%`). At 1280px and up the workstation is `3fr` / `2fr`. At 1024px the columns tighten. Below 900px they stack. The copilot card stretches to the column, stays sticky, and grows to its content height (no inner `max-height` or overflow scroll). Page or column scroll handles overflow. Type and spacing use `clamp()`. The card itself uses `--tc-surface` and `--tc-text`. Clear / Caution / High color sits on the level badge (`--tc-risk-*`), not as a full-card fill. Action, quote, chip, and secondary pairs follow the active Light/Dark tokens. The card reads the server level, the server `risk.score` as **Urgency Score** `<score>/<max>`, the first reason or the counterpoint when reasons are empty, `question.text`, and `talk_track.lines`. The max is `contract/session_state.schema.json` `risk.score.maximum` (same clamp as architecture §6.2, `+100`). Suggested action is `question.text` when the server has a question, otherwise the first talk-track line. The workstation does not show a predefined-answer chip panel; the two-tap opener stays on Session (`QuestionCard`). The card renders the returned `SessionState`. It does not choose the next question, and it does not compute risk, level, reasons, or the next question. Demo copy never shows a customer's name, age band, age, or gendered pronouns: those values stay in demo/API payloads and render as **Customer**.

CHANGE-005 fields are optional. `readExplanation` accepts `explanation` or `Explanation`, and `used_fallback` / `usedFallback`, `signal_id` / `signalId`. Contributions with `direction: "raises"` render under What raised it. `direction: "lowers"` render under What would lower it. There is no second contributions list. A strength word (Strong / Moderate / Minor factor) is the item's `|weight|` divided by the sum of `|weight|` in that response (`>= 1/3` strong, `>= 1/6` moderate, otherwise minor). The raw weight and any `sig.*` / `chip.*` id stay inside the collapsed Technical details. Confidence `null` reads "Not applicable (rules engine)". The gap sentence shows only when explanation is absent or null. Without an explanation, Clear puts `counterpoint` under What raised it and `reasons` under What would lower it, matching architecture §6.5. That is placement of server fields, not a new score.

`context_chips` source renders as a read-only Observed or Teller confirmed pill on the matching Why this level factor. That list is the model's analysis: reasons, strength, timeline note, and What would lower it. It has no confirm/dismiss/restore controls and no teller Observed toggle. Teller confirm/deny lives on the separate signal chips on the copilot card (first-seen `chipOrder` from #94). There is no second list titled "What the teller and system noted", no Recent activity table, and no customer-file copy of the same signals. A context chip with no mapped signal is notes-only and stays off Why this level; it is not appended to the read-aloud script. Simulation posts send `source: "observed"`; manual context posts send `source: "teller"`. `GET /sessions/{id}/activity` supplies at most one local “Noted” time on Why this level. It does not render a second table. Absent fields, mock mode, and T1–T7 fixtures keep working. Confirm still marks a chip locally and does not post it again. Dismiss undoes back to that chip and reposts the rest with the same source; the dismissed chip stays on the copilot list, dimmed, with Restore. Restore re-posts that chip with the same source. Undo sits on Home only and reverses the last teller confirm, dismiss, or restore; otherwise it posts `/undo` and renders the returned state. Escalate records outcome `escalate` with actor `teller` and opens handoff. The card renders one server snapshot. While a write is in flight it keeps that last snapshot on screen (the card and teller signal list stay mounted; the body dims and a small inline updating chip appears) instead of mixing fields or replacing the card. Before Play and after Start new customer (`index === 0` and not playing) the card is an idle placeholder; Undo and Escalate stay off until a visit is live.

A successful `POST /outcome` closes the visit on the server. SessionState does not carry `closed`, so the client remembers it. The four outcome choices stay enabled while the visit is open. After the decision, or after a `session_closed` response, those controls and undo, confirm, dismiss, and escalate are hidden. The screen offers Start new customer, which opens another live session with `mode` and `amount_band`. Errors are one plain sentence. The page does not show `Status 409` or `session_closed`.

Every screen uses a two-column fact grid (`max-content 1fr`, `--tc-space-3` column-gap, `--tc-space-2` row-gap, `align-items: baseline`, `--tc-line-fact` = `--tc-text-base`): bold labels, normal values, bold section headings. Transaction Type / Amount / Memo, the customer-file profile, Outcome, and Handoff share that layout. Amount keeps `--tc-text-2xl` and the same line-height token so the larger type does not add extra row gap. Handoff is a card titled from the recorded outcome (`Handoff — Escalated by teller` when the teller escalated). The level is an icon plus a word. A UUID session id shows its first eight characters, with the full id on the tooltip and the copy button. Suggested outcome and the teller's decision are separate rows.

The header wraps when the first row is tight (1024px, 1180px, 1280px, and 125% / 150% zoom on a 1440px laptop). One gap token (`--tc-space-header`, 8px) sits between the bank mark, title, pills, tabs, scheme control, and `?`. Bank mark, title, tabs, and `?` keep their full labels. Title does not ellipsize. The tab group (`flex: 1 1 auto`) fills the leftover space between the status pills and the scheme control. The four tabs share that row evenly (`flex: 1 1 0`, text centered, `min-width: min-content`) with the same header gap. The active-tab pill keeps the shared radius and equal padding. Tabs stay complete: they wrap to a second row and never clip (`Hand…` is a bug). Tab labels use `--tc-text-sm`. The nav does not use `overflow-x: auto`. There is no Presenter control. At viewports and header containers below 1280px, the theme segment collapses into a menu. Only the active scheme control is mounted. Simulation and connection pills share `--tc-text-sm`. Header controls share `--tc-header-control-h` (48px) and the pill radius token (`999px`). The tellr logo (`mark: 'logo'`) is flex-centered in that same 48px pill (`object-fit: contain`, `line-height: 0`, mask/image centered). Every bank applies `font-size-adjust: 0.52` so Poppins, Arial, and Segoe UI render at the same apparent size. The simulation pill says `Simulation: <customer title>` while a synthetic customer is selected, and `LIVE — no scenario loaded` for a live session with no simulation. It keeps one class (`tc-live-badge`) and the shared type/control-height tokens idle, running, paused, and after Play. Width is `--tc-sim-pill-min` / `--tc-sim-pill-max` (`flex: 0 0 auto`) so tab flex after #100/#101 cannot resize it; ellipsis plus a title tooltip is only for a label that still cannot fit. Labels stay complete at 1024 / 1180 / 1280. The connection pill, Play/Pause, speed segment, and timer use the same control height; Play/Pause and Show/Hide share a grid so the longer label reserves the width; the timer uses `tabular-nums`, `--tc-text-sm`, and `--tc-timer-min`. The connection pill says `Live API connected` or `Using sample data` from `GET /health` (`web/src/connection.ts`). Undo sits with the merged Why this level list on Home. Customer file, Outcome, and Handoff do not show a stray Undo above the heading. Context and Session still get the top Undo when those routes are open. Header-to-content uses `--tc-space-header-content`. Context, Session, History, and Health stay off the nav. The four demo tabs stay labeled: Home, Customer file, Outcome, and Handoff. Outcome and Handoff are hint labels until a visit exists; they do not add screens.

The toolbar controls share the 48px control-height token. Play keeps the icon and the word on one line. The customer select matches that height. Show case file sits on the same row. The elapsed timer and a live local time-of-day clock sit on that row. The clock uses `Intl` / `Date` local time (`web/src/ui/localTime.ts`, `web/src/ui/LocalClock.tsx`) and ticks each minute. History `opened_at` / `closed_at` and noted activity stamps use the same local formatter. Naive API stamps are treated as UTC, then shown in the client zone. Session open may send `opened_at` (ISO with offset) and an IANA `timezone`; the API stores that offset timestamp (`api/time.py`) and does not use naive UTC for local hour. The elapsed timer is still simulated customer time (sum of `delayMs`).

Playback length at 1× is the sum of each event's `delayMs`. 2× halves it and 4× quarters it. Reduced motion uses a 0 wait. Targets: routine Friday 20s, car down payment 32s, government impersonation and romance/crypto 45s, contractor cash 60s. The on-screen clock and the timeline stamps are the same unit: simulated customer time (the running sum of `delayMs`). Speed changes wall-clock duration only. Timeline rows show step, elapsed time, and speaker, and bold amounts and phrases such as "on the phone" and "cash". The footer uses `--tc-text-xs`.

The demo layout is always on. `?present` and `teller.presenter` are ignored, and nothing in the UI names that layout. It hides Context, Session, History, and Health; sets the `html` font size to 105%; resets the session when the customer changes; enlarges the current-event caption; and keeps the working keys: help (`?`), play/pause (`P`), step (`N`), restart (`R`, confirm button reads Restart), confirm (`C`), dismiss (`D`), escalate (`E`), customer switch (`[` / `]`), and bank theme (`T`). Those keys are registered once at the app shell (`web/src/ui/DemoShortcuts.tsx` + `web/src/ui/shortcuts.ts`), so they work on Customer file, Outcome, and Handoff as well as Home. They ignore typing in inputs, textareas, selects, and contenteditable, and they ignore Ctrl, Cmd, or Alt. Type comes from `web/src/theme/typeScale.ts` (`--tc-text-xs`…`--tc-text-2xl`). Gaps and card padding come from `DENSITY` in `web/src/theme/tokens.ts` plus the matching `clamp()` space tokens in `web/src/index.css` (~15–20% tighter than the first workstation pass) so a 1280×720 laptop sees the header, toolbar, transaction, and copilot without horizontal clip. Vertical rhythm uses one 4 / 8 / 12 / 16 / 24 scale (`--tc-space-1`…`--tc-space-5`): 16px header-to-content (`--tc-space-header-content`), 8px heading-to-body (`--tc-space-heading-body`), 12px body-to-control (`--tc-space-body-control`), and 8×12 padding inside pills and buttons. Suggested outcome uses `--tc-highlight` / `--tc-highlight-fg`. The full UI reference is `docs/UI_REFERENCE.md`.

| File | What it is |
|---|---|
| `web/src/demo/customers.ts` | Five synthetic files and `SCRIPT_TARGETS_MS`. The last two post no chips. Files that post `chip.above_threshold` set `transaction.type` to that chip's library label. Name and age band stay in the data and are not rendered. |
| `web/src/demo/customers.test.ts` | Five files, script pacing, and Type strings for above-threshold vs routine files. |
| `web/src/demo/clock.ts` | Simulated `m:ss` elapsed (sum of `delayMs`) for the toolbar elapsed timer and timeline. |
| `web/src/demo/clock.test.ts` | Elapsed timer and timeline stay on simulated time at 1× and 4×. |
| `web/src/ui/localTime.ts` | Parse session stamps (naive ISO = UTC), format local time of day, emit ISO with the client offset. |
| `web/src/ui/localTime.test.tsx` | UTC 05:17 on a UTC-4 client renders 1:17; live clock ticks each minute. |
| `web/src/ui/LocalClock.tsx` | Live local time-of-day on the toolbar. Ticks at the next minute. Display only. Type from `--tc-text-sm` (`typeScale.ts`). |
| `web/src/demoPolish.test.tsx` | Timer matches timeline, shortcut list, Restart confirm, four labeled tabs, full-width card, footer on `--tc-text-xs`. |
| `web/src/presenter.tsx` | Demo layout, always on. No toggle and no `?present` switch. |
| `web/src/screens/HomeScreen.tsx` | Toolbar, transaction panel, copilot card, explanation. Holds the last session / posted chips / activity while a write is in flight so the card does not mix snapshots. |
| `web/src/screens/CustomerFileScreen.tsx` | Profile only: Customer (never a name), tenure, typical withdrawal, channels. No age band. Uses the shared `tc-kv` grid. Visit amount, signals, and activity stay on the workstation. No Undo. |
| `web/src/screens/HandoffScreen.tsx` | Handoff card. Fact grid, level badge, Urgency Score `<score>/<max>`, flagged list from the merged SessionState rows (reasons when that list is empty), with dismissed/confirmed marks when that data is in state. |
| `web/src/ui/facts.tsx` | Bold-label fact grid (`tc-facts`) and section headings shared by the screens. Same columns, gaps, baseline, and `--tc-line-fact` as `tc-kv`. |
| `web/src/ui/plain.ts` | Teller-facing labels: pattern, mode, outcome, short id, amount band, recommender phrase. Activity / noted times use local `formatLocalDateTime`. |
| `web/src/ui/privacy.ts` | Display-only Customer label and name/pronoun redaction. Does not change API or demo payloads. |
| `web/src/privacy.test.tsx` | Home, Customer file, Outcome, and Handoff render no name, age band, or gendered pronouns. Timeline speaker is Customer. |
| `web/src/ui/urgencyScore.ts` | `URGENCY_SCORE_MAX` from the contract `risk.score.maximum` (architecture §6.2 clamp +100). Label and `<score>/<max>` formatter. Does not compute the score. |
| `web/src/ui/urgencyScore.test.ts` | Max matches both session and handoff schemas. Display does not clamp a server value. |
| `web/src/ui/emphasis.tsx` | Bolds amounts and phrases such as "on the phone" in timeline copy. |
| `web/src/LiveBadge.tsx` | Header simulation pill. Label from `liveBadgeText`. Same class and tokens whether the demo is idle or playing. |
| `web/src/workstation/Toolbar.tsx` | Shared 48px customer picker, Play/Pause (stable grid width), Step, Restart, speed segments, elapsed timer (`tabular-nums`), live local clock, case-file link. |
| `web/src/workstation/CopilotStrip.tsx` | Sticky card that fills the column and grows with its content (no inner scroll). Surface/text tokens for the card; risk color on the level badge. Idle placeholder before play. Last snapshot stays mounted while a write is in flight (dim + inline updating chip). Level icon and word, Urgency Score `<score>/<max>`, one reason, suggested action, collapsible read-aloud quote that is only the label plus `talk_track.lines`. Teller confirm / dismiss / restore sit on the signal chips (stable `chipOrder`). No predefined-answer chip panel. |
| `web/src/workstation/QuestionCard.tsx` | Two-tap opener and answer chips on Session (`InterviewScreen`) only. |
| `web/src/workstation.test.tsx` | Home has no answer-chip panel, keeps suggested action from the server question, one Level row, teller confirm/deny on the copilot chips, and Urgency Score. |
| `web/src/screens/NotFoundScreen.tsx` | Unknown paths and session routes with no visit. Short “start a customer” copy and a Home link. |
| `web/src/emptyRoutes.test.tsx` | `/outcome`, `/handoff`, `/history`, `/session`, `/context` and session URLs without a visit. `/health` already has content. |
| `web/src/feed.ts` | Merged Why this level rows (`mergeSignalRows`), first-seen chip order, source badges, and the handoff flagged list. Display only; no risk math. |
| `web/src/feed.test.ts` | Stable chip order, merged leftover chips, and handoff listing from the merged rows. |
| `web/src/workstation/explain.ts` | Reads `explanation` and groups raises and lowers. Strength words from the response's own weights. |
| `web/src/workstation/ExplanationPanel.tsx` | Why this level. Fact grid (one Level row, plus raw level only when it differs, Urgency Score `<score>/<max>`, pattern, suggested outcome). Read-only model list: reason, origin pill, strength, What would lower it. No confirm/dismiss. Optional single local noted time from `GET /activity`. Collapsed technical details. |
| `web/src/workstation/TransactionPanel.tsx` | Key-value transaction (type, amount, memo once) on the shared `tc-kv` grid. Type is `customer.transaction.type` (no client rewrite). The label column is `max-content`; the value wraps (`overflow-wrap: break-word`). Then the timeline (speaker Customer), optional case file without name/age, and event progress. Banner is `Practice data.` |
| `web/src/ui/ShortcutHelp.tsx` | `?` lists the working keys: `?`, `P`, `N`, `R`, `C`, `D`, `E`, `[` / `]`, `T` in a two-column grid so `[` and `]` align. Notes that they work on every screen. No key is route-limited. |
| `web/src/ui/shortcuts.ts` | Pure key map, including `T` → theme. Escape always closes help or a confirm. Other keys no-op while typing or while Ctrl/Cmd/Alt is held. |
| `web/src/ui/DemoShortcuts.tsx` | One window listener, mounted from `ConnectedShell`. Home, Customer file, Outcome, and Handoff share it. |
| `web/src/ui/shortcuts.test.ts` | Key map, modifier ignore, and contenteditable / field ignore. |
| `web/src/shortcutsCustomer.test.tsx` | Keys fire on `/customer`. Restart confirm works there. Outcome and Handoff still get help, restart, and customer switch. |
| `web/src/ui/icons.tsx` | Play, pause, step, restart, confirm, and dismiss icons. |
| `web/src/ui/ConfirmDialog.tsx` | Confirm before restart and escalate. Customer switch resets without a dialog. |
| `web/src/connection.ts` | Probes `GET /health` and chooses the live origin or the sample-data fallback. |
| `web/src/errors.ts` | Plain sentences for API errors. No status code and no error code on screen. |
| `web/src/presenter.test.tsx` | Demo layout stays on when `?present=0` is set. Hidden dev tabs, type size 105%, no Presenter button, four labeled tabs, Restart key. |
| `web/src/workstationFit.test.tsx` | Laptop fit: 3fr/2fr at 1280, stack below 900, scheme collapse at 1280, header wrap, simulation pill ellipsis+tooltip, scaled clamps. |
| `web/src/headerRhythm.test.tsx` | Nav labels stay complete at 1024 / 1180 / 1280 for each bank (T cycles them). Logo centering CSS. Spacing tokens exist and are used. `tc-kv` / `tc-facts` share `max-content 1fr`, `--tc-space-3` / `--tc-space-2`, baseline, and `--tc-line-fact`. |
| `web/src/headerSimPill.test.tsx` | Simulation pill / header class names, type tokens, and control sizes stay the same idle vs running vs paused vs after in tellr / pnc / mtb / fnb. Labels complete at 1024 / 1180 / 1280. |
| `web/src/copilotCard.test.tsx` | Reversible dismiss/undo, idle placeholder, in-flight snapshot hold, card/list stay mounted on dismiss, Urgency Score format, inline origin pill, no Outcome/Handoff Undo. Read-aloud card is the label plus `talk_track.lines` only. |
| `web/src/copilotScroll.test.tsx` | Copilot panel, read-aloud script card, and signal list have no inner overflow scroll or max-height. |
| `web/src/workstationMerge.test.tsx` | Recent activity removed; model reasons stay on Why this level; teller confirm/deny on the copilot chips; timeline above the case file; amount and threshold shown once. |
| `web/scripts/measure-fit.mjs` | Headless Chrome measures scrollWidth and header clip at 1024/1280/1440 in light and dark. Not part of `gate.sh b`. |
| `web/mock/live_levels.json` | Recorded engine responses for context-chip subsets. The mock uses these when a live post is not the next fixture step. The mock echoes `context_chips` from the live log and serves `GET /activity`. It leaves `explanation` off unless the recorded body already has it. |
| `web/mock/live_answers.json` | Recorded engine responses for live answers on the demo chip sets (empty, government impersonation prefixes, contractor cash, romance/crypto). The mock looks them up after `POST /answers`; it does not score. Unrecorded combinations keep the last recorded answer state or the context projection and warn. `npm run dev:api` scores every answer through the API. |
| `web/src/routes.ts` | Nav labels are Home, Customer file, Context, Session, Outcome, Handoff, History, Health. |

### `web/` dev modes

Two local runs. Neither script starts the API. On load, `web/src/connection.ts` calls `GET /health` on `VITE_API_URL` when that is set, otherwise on `http://127.0.0.1:8000`. A health report selects that origin (`Live API connected`) and `setApiBase` points later requests there. If that probe fails and the Vite origin answers `/health`, requests stay on the page origin (`Using sample data`). If neither answers, the pill says `API not connected`. Vitest skips the probe and uses `VITE_API_URL` or the page origin. See `docs/UI_REFERENCE.md`.

Real-API mode uses the CORS middleware from #71, merged at `6d063eb` (8:24 PM ET). `api/main.py` allows any origin and sends no credentials, so a page on `http://127.0.0.1:5173` can call `http://127.0.0.1:8000`. Restart uvicorn if it was started before the pull.

| File | What it is |
|---|---|
| `web/package.json` | `dev` is `vite`. `dev:api` is `vite --mode api`. The script has no `VAR=value` prefix, so Windows PowerShell can run it. |
| `web/.env.api` | Loaded only for mode `api`. Sets `VITE_API_URL=http://127.0.0.1:8000`. |
| `web/vite.config.ts` | Always installs `mockApiPlugin`, including when `VITE_API_URL` is set, so a failed health probe can fall back. |
| `web/src/devApi.ts` | `useMockApi` (true when the URL is blank) and `directoryFromFileUrl` (config directory, including `C:/...`). |
| `web/src/devApi.test.ts` | Scripts, `.env.api`, and the mock plugin staying installed. |
| `web/src/api.ts` | `apiBase()` is the probed origin when set, otherwise `VITE_API_URL`. |
| `web/.gitignore` | Ignores `.env.local` and `.env.*.local` so a machine can override the origin. |

Windows PowerShell, from the repo:

Either script. If the API is already on port 8000, the page uses it. If it is not, the page uses sample data.

```
cd web
npm run dev
```

Real API, with the origin pinned in `web/.env.api`. Start the API on port 8000 from current main (`python -m uvicorn api.main:app --port 8000`). Then:

```
cd web
npm run dev:api
```

The browser calls `http://127.0.0.1:8000` when `GET /health` succeeds. The mock plugin remains installed for the fallback. Live session opens send `{ mode: "live", amount_band }`.

To point at another origin, set the variable in that PowerShell window and then start the script:

```
$env:VITE_API_URL = "http://127.0.0.1:9000"
npm run dev:api
```

Or put `VITE_API_URL=http://127.0.0.1:9000` in `web/.env.api.local`. The probe uses that origin when its `/health` succeeds, and sample data when it does not.

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
| Frontend screens | `docs/architecture.md` §12; UI decisions in `docs/UI_REFERENCE.md` |
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
