# UI reference

This is the teller-facing UI as it stands. Read it before changing `web/`. The map is `ARCHITECTURE.md` (web section). The product spec is `docs/architecture.md` §12. This file records the decisions already made in `web/` so the next change follows them.

`web/` renders server state. It does not compute risk, a level, reasons, or the next question. Optional fields (`explanation`, `context_chips`, `debug`, activity rows) may be absent. The screens still render.

## Themes and design schema

Bank chrome is one typed theme plus CSS variables. Screens read tokens. They do not branch on the bank id.

| Token | Use |
|---|---|
| `--tc-text`, `--tc-muted` | Body and secondary text |
| `--tc-bg-color`, `--tc-bg-image` | Page. A solid color sits under the gradient |
| `--tc-glass-fill`, `--tc-glass-border`, `--tc-glass-fallback` | Card. Fallback is opaque when `backdrop-filter` is missing |
| `--tc-button`, `--tc-button-text` | Primary controls |
| `--tc-secondary-bg`, `--tc-secondary-fg`, `--tc-secondary-border` | Secondary and dismiss |
| `--tc-chip-bg`, `--tc-chip-fg` | Badges |
| `--tc-action-bg`, `--tc-action-fg` | Suggested-action block and the closed-visit bar |
| `--tc-quote-bg`, `--tc-quote-fg`, `--tc-quote-border` | Read-aloud script |
| `--tc-risk-clear-*`, `--tc-risk-caution-*`, `--tc-risk-high-*` | Level surfaces. The level is an icon plus a word |
| `--tc-accent`, `--tc-link`, `--tc-input` | Focus, links, fields |
| `--tc-radius-card`, `--tc-radius-control` | Corners |

`?theme=<id>` selects a registered theme and stores `teller.theme`. An unknown id falls back to the stored id, then `tellr`. Adding a bank is one file in `web/src/theme/themes/` that exports `theme`.

| Id | What it is |
|---|---|
| `tellr` | Default. Poppins, comfortable density, pill controls, navy-to-indigo gradient, light indigo field. Logo in the header |
| `mtb` | M&T example. Segoe UI, Georgia wordmark, round controls, green gradient plus `web/src/assets/weave.svg` |
| `fnb` | F.N.B. Compact density, square corners, hard shadow |
| `pnc` | Arial, comfortable density, orange `#EF7622` on slate-to-navy |

Each theme has a dark palette on the theme object and a `light` palette. `themeForScheme` does not mutate the registered theme. `web/src/themeContrast.test.ts` checks WCAG AA for text, buttons, glass, links, badges, select options (surface/text and button/button-text), and clear/caution/high on every bank in light and dark.

The header control is Light / Dark / System, stored as `teller.colorScheme`. System follows `prefers-color-scheme` and is dark when that query is missing. `web/index.html` sets `color-scheme` to `light dark` and `darkreader-lock`. `:root` sets `color-scheme: light dark`. The active scheme is also set on the theme root so form controls match.

Native `<select>` popups follow the resolved scheme, including System after it resolves. Windows Chrome and Edge paint the option list from the select's own `color-scheme`. Leaving `:root` as `light dark` made a white list under the dark theme's light text, so unselected options disappeared. Every select sets `color-scheme` to `dark` or `light` from `data-scheme` / `data-color-scheme`. Resting options use `--tc-surface` and `--tc-text`. Hover, focus, and selected options use `--tc-button` and `--tc-button-text`. Both pairs are opaque. `prefers-contrast: more` keeps those pairs and thickens the border. `forced-colors: active` uses `Field` / `FieldText` for resting options and `Highlight` / `HighlightText` for hover and selected, with the select itself on `ButtonFace` / `ButtonText`.

Page gradients are hex and rgba only. Windows Chrome and Edge drop an entire `background-image` when any layer is invalid. Do not use percentage ellipse radii (`ellipse 72% 58%`) or the keyword `transparent` inside a gradient. Chromium interpolates `transparent` as transparent black.

## Layout breakpoints

The page card is `min(1440px, 100%)` and starts at the top of the page so the header is not clipped. There is no progress-dot column.

| Width | Layout |
|---|---|
| Below 900px | Workstation columns stack |
| 900px and up | Transaction and copilot side by side, about `1.15fr` / `0.85fr` |
| 1024px and up | Columns tighten to about `1.4fr` / `1fr` |
| 1280px and up | `3fr` / `2fr`. Copilot stays sticky and scrolls inside the column |
| Header container under 1120px | Light/Dark/System segment hides. A single scheme menu replaces it |

Type and padding use `clamp()`. Prose is at most `70ch`. Toolbar controls share a 40px height. Play keeps the icon and the word on one line. The customer select matches that height. Show case file and the elapsed timer sit on that row.

Target playback at 1× is the sum of each event's `delayMs`. 2× halves it and 4× quarters it. Reduced motion uses a 0 wait. Targets: routine Friday 20s, car down payment 32s, government impersonation and romance/crypto 45s, contractor cash 60s.

## Header and toolbar

One row, `flex-wrap: nowrap`, nav scrolls, no second line:

1. Bank mark
2. Title "Teller Copilot"
3. Simulation pill: `Simulation: <customer title>`, or `LIVE — no scenario loaded` when the session is live and no synthetic customer is selected
4. Connection pill (see Live and sample)
5. Tabs that fit the demo layout: Home, Customer file, and, once a session exists, Outcome and Handoff
6. Light / Dark / System
7. `?` opens keyboard help

There is no Presenter button.

The toolbar is the simulated-customer select, Play/Pause, Step, Restart, speed `1` `2` `4`, the elapsed `m:ss` timer, and Show case file.

## Screens and fields

Fact grids are two columns: a bold label beside a normal value. Section headings are bold. Do not put a label in a paragraph and the value on the next line when a fact grid fits.

| Screen | Route | On the demo nav | Fields |
|---|---|---|---|
| Workstation | `/` | Yes | Library version and copy status. Toolbar. Transaction (type, amount, memo), timeline with step, time, and speaker, event progress. Copilot: level icon and word, one reason (or the counterpoint when reasons are empty), suggested next action (`question.text`, else the first talk-track line), read-aloud script, signal rows. Why this level, below the columns |
| Customer file | `/customer` | Yes | Banner that name and age band stay on this screen. Profile: name, age band, tenure, typical withdrawal, channels. Recent activity (session `GET /activity` when it has rows, otherwise the synthetic date / description / amount table). This withdrawal: type, amount, memo. What was noted: each script signal once, with Not yet, Observed, Teller confirmed, or Dismissed |
| Context | `/sessions/:id/context` | No | "What you noticed." Chip buttons from `GET /library`. Posts `source: "teller"`. Does not score |
| Session | `/sessions/:id` | No | Level icon and word, three-step scale, pattern, score, stated purpose, "Why it was flagged", counterpoint ("In their favor" or "Still noted"). Question text, purpose row on the opener, five answer slots, why. Talk track and avoid list. A recommended stop says "You have enough to decide, or ask one more" and keeps the question quieter. A hard stop shows `stop.reason` and no question |
| Outcome | `/sessions/:id/outcome` | Yes, once a session exists | Suggested outcome, questions answered. Teller's decision: Proceed, Slow down, Escalate, Report. All four stay available while the visit is open. The highlighted one is only a suggestion. Report is never highlighted. Teller name. Record decision, enabled once a choice and a name are set. After the visit closes, the choices, the name field, and Record decision are gone. The card shows the recorded decision and Start new customer |
| Handoff | `/sessions/:id/handoff` | Yes, once a session exists | Title from the recorded outcome (`Handoff — Escalated by teller` when the teller escalated). Short session id (first eight characters of a UUID) with the full id on the tooltip and Copy. Mode, questions answered, level badge, score, pattern, stated purpose, suggested outcome, teller's decision, recorded by, stop. "Why it was flagged" and the counterpoint line |
| History | `/sessions` | No | Live rows from `GET /sessions`. Practice is a second request, `GET /sessions?mode=practice`. Session id, mode, opened, closed, library version |
| Health | `/health` | No | `GET /health` only. Decision engine, model, typical response, slow response, last slow response, fallback rate, rejections, agreement with the rules. The screen does not change the engine. `/settings` redirects here |

Name and age band are display-only on the customer file. They are not posted.

## Plain language

Teller-facing copy does not show `sig.*`, `chip.*`, `mit.*`, `pat.*`, `purpose.*`, `q.*`, or `tt.*` ids. Those ids stay inside collapsed Technical details, with the raw weight.

| Server value | On screen |
|---|---|
| `pattern_label` | Drop a leading "Pattern ". "Unclear" when the remainder is empty or "unclear" |
| `mode` `live` / `practice` | Live / Practice |
| `suggested_outcome` | Proceed, Slow down, Escalate |
| Recorded outcome | Those three, plus Report |
| Level | Clear, Caution, High, with an icon |
| Recommender `rules` | rules engine |
| `local` / `local_llm` | on-device model |
| `hosted` / `hosted_llm` | hosted model |
| `fake` | practice stand-in |
| Amount band `5000_9999` | $5,000–$9,999. Unknown bands become "Amount on the visit" |
| Activity `type` | Noted at the window, Customer answered, Visit opened, Decision recorded, Visit closed, Handoff opened, Undone |
| UUID session id | First eight characters. Shorter ids stay whole |
| Actor `teller` | Teller |
| Confidence `null` | Not applicable (rules engine) |
| Strength | Strong factor, Moderate factor, or Minor factor from `\|weight\| / sum(\|weight\|)` in that response. `>= 1/3` strong, `>= 1/6` moderate, otherwise minor. This is presentation of server weights. It is not a new score |

Signal source is Observed or Teller confirmed. Customer-file rows may also say Not yet or Dismissed.

## Accessibility

- Skip link, `header`, nav named Screens, `main`
- A polite live region announces the level word and the suggested action
- Buttons are at least 48px on the primary chrome. Toolbar controls are 40px and keep a visible name or `aria-label`
- Focus is a 2px outline plus the accent ring. `prefers-contrast: more` thickens borders and focus
- `forced-colors: active` uses `Canvas`, `ButtonFace`, `ButtonText`, `Field`, `FieldText`, `Highlight`, and `HighlightText`. Borders and focus stay. The level is still an icon plus a word. Select options use Field/FieldText, and the highlighted option uses Highlight/HighlightText
- `prefers-reduced-motion: reduce` cuts animation, transitions, the press offset, and simulation waits
- Do not use color alone for the level or for Observed versus Teller confirmed
- 200% zoom: the header stays one row and the nav scrolls. Columns stack below 900px. Do not set a fixed page width that clips the decision buttons

## Dark mode, light mode, and forced colors

Light, Dark, and System are the only color choices in the header. System is the stored default until the teller picks one. Both palettes keep a solid `background.color` under the gradient so a dropped `background-image` still has a field. `darkreader-lock` asks Dark Reader not to recolor the page. Forced colors override surfaces to system colors in `web/src/index.css`. Do not add a second dark-mode implementation.

## Demo layout

The larger demo layout is always on. There is no toggle, no `?present` switch, and no user-facing name for it. `?present=0` and `teller.presenter` do not turn it off, and the app does not write either one.

While it is on, which is always:

- Root font size is 125%
- Context, Session, History, and Health are off the nav. The routes still exist
- Changing the simulated customer resets the session without a confirm dialog
- The current-event caption is the larger size
- Keys that work: `?` help, `P` play/pause, `N` step, Escape closes help and dialogs
- Keys that do not fire: `R`, `C`, `D`, `E`, `[`, `]`
- Restart and Escalate in the UI still ask for confirmation. Escalate posts `{ outcome: "escalate", actor: "teller" }` and opens handoff

## Live and sample

The header pill is driven by `GET /health`, not by a build flag alone.

| Probe | Pill | Requests go to |
|---|---|---|
| `VITE_API_URL/health`, or `http://127.0.0.1:8000/health` when that variable is unset, returns a health report | Live API connected | That origin |
| That probe fails and the page origin answers `/health` | Using sample data | The Vite origin (mock plugin) |
| Neither answers | API not connected | The configured origin, which will fail until the API is up |

`npm run dev` and `npm run dev:api` both install the mock plugin. `npm run dev:api` loads `web/.env.api`, which sets `VITE_API_URL=http://127.0.0.1:8000`. The script has no inline `VAR=value`, so Windows PowerShell can run it. Override the origin with `web/.env.api.local` or `$env:VITE_API_URL`.

CORS from #71 allows the Vite origin to call port 8000 with no credentials. Start the API with `python -m uvicorn api.main:app --host 127.0.0.1 --port 8000`. Neither npm script starts it.

A live open from the workstation is `POST /sessions` with `{ mode: "live", amount_band }`. `amount_band` comes from the T1 opening request (`5000_9999` when that request is missing). The body does not include `scenario_id`, a name, or an age. Practice opens from the fixture runner send `mode`, `amount_band`, and `scenario_id`.

Vitest does not probe port 8000. Tests use `VITE_API_URL` when a test sets it, otherwise the page origin.

## Errors and closed visits

`POST /outcome` appends the decision and then closes the session. SessionState does not include `closed`, so the client records it when that post returns 200, and when any response is 409 `session_closed`.

While the visit is open, all four outcome buttons stay enabled. Disabled Record decision means the name or the choice is missing. That is not a level gate.

Once the visit is closed:

- Outcome choices, the teller name field, Record decision, undo, confirm, dismiss, and escalate are hidden
- Context, answer, undo, and outcome posts are not sent
- Playback stops
- The outcome card says the visit is closed, shows the decision when this page recorded it, and offers Start new customer
- Other screens show the same sentence and the same button
- Start new customer opens another live session and returns to the workstation. A failed open leaves the closed visit in place

The page never shows `Status 409`, `session_closed`, or the server's `session is closed`. The sentence for that case is "This visit is already closed. Start a new customer to continue." Other codes become one sentence in `web/src/errors.ts` (missing teller name, purpose on the opener, purpose on a later question, practice scenario on a live visit, close without a decision). Anything else is "The copilot could not complete that step. Try again, or start a new customer." A network failure is "The copilot service is not reachable."

The dev schema banner can still list contract mismatches. It is not the teller error.

## Customer files

Five synthetic files live in `web/src/demo/customers.ts`. They are not eval scenarios.

| Id | Title | Signals |
|---|---|---|
| `contractor-cash` | Contractor cash, coached | Posted on the timeline |
| `romance-crypto` | Romance, crypto cash | Posted on the timeline |
| `government-impersonation` | Government impersonation | Posted on the timeline |
| `benign-car` | Car down payment | Timeline only. No chips, so a clear level is not a false alarm |
| `benign-routine` | Routine Friday cash | Timeline only. No chips, so a clear level is not a false alarm |

Name and age band render on the customer file only.

## Explanation panel

"Why this level" shows each fact once.

1. Level summary: shown level, raw level, score, pattern, suggested outcome
2. What raised it
3. What would lower it
4. Technical details, collapsed

Contributions with `raises` go under What raised it. `lowers` go under What would lower it. `readExplanation` accepts `explanation` or `Explanation`, `used_fallback` or `usedFallback`, and `signal_id` or `signalId`. Without an explanation, Clear puts `counterpoint` under What raised it and `reasons` under What would lower it. That follows architecture §6.5. It is placement, not a new score.

When a factor matches a context chip that was posted or echoed, that row carries Observed or Teller confirmed. Do not add a second list of the same facts. The copilot rows stay, because they are the confirm and dismiss controls.

The gap sentence ("not in this response") shows only when `explanation` is absent or null. Confidence stays hidden from the summary when it is null; Technical details say "Not applicable (rules engine)." `used_fallback` is one sentence in Technical details. Raw weights and ids stay there too.

`GET /health` inside the panel is service-wide agreement and fallback. The copy says those rates are not this decision.

## Keyboard

| Key | Demo layout |
|---|---|
| `?` | Show or hide shortcut help. Escape closes it |
| `P` | Play or pause |
| `N` | Step one customer event |
| `R`, `C`, `D`, `E`, `[`, `]` | Not active. Restart and Escalate remain buttons with confirm dialogs |

Typing in a field, and holding Ctrl, Alt, or Meta, does not trigger these keys.

## Do not

- Add an age, appearance, or name field that is sent to the API. Name and age band on the customer file are display-only
- Send teller notes or any free text to a model
- Compute risk, level, reasons, or the next question in `web/`
- Disable an outcome button because of the level. Hide the whole decision only after the visit is closed
- Show `sig.*` ids or raw error codes to the teller
- Let stated purpose change the score or the displayed pattern. The client only renders what the server sent
- Edit weights, golden expectations, `contract/`, or another lane's directories
- Read `eval/scenarios/dev/`, `eval/scenarios/heldout/`, or `library/signals.yaml` while doing UI work
