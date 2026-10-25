# Spec questions

Agents append; drivers answer. An open question blocks only the work that depends on it.

### Q-001 · Stop precedence when a recommended and a hard stop coincide
- **Raised by:** kit build · **Sections:** architecture §8.4, §11.2
- **Detail:** In T1's last step (six-question bank), the proceed stop and "no eligible candidate"
  both hold. §8.4 lists both rows but no precedence; §11.2 says `question` is null only on a hard
  stop.
- **Status:** answered by CHANGE-000.

### Q-002 · No settings endpoint
- **Raised by:** kit build · **Sections:** architecture §7.4, §11.1, §12
- **Detail:** §7.4 makes the recommender "swappable at runtime from Settings" and §12 lists a
  Settings screen, but §11.1 has no endpoint for it. B-06 cannot be built as specified.
- **Status:** answered by CHANGE-001 (rejected, Driver A). Settings are read-only
  through `/health` plus a boot flag.

### Q-003 · No error response shape
- **Raised by:** kit build · **Sections:** architecture §4 (command handler), §11.1
- **Detail:** The command handler rejects invalid commands, but the architecture never says what
  B receives when it does, so B has nothing to render.
- **Status:** answered by CHANGE-002 (accepted, Driver A). Exhaustive 409 codes in
  `contract/error.schema.json`; malformed bodies return 422.

### Q-002 / CHANGE-001 · Driver note (neutral; not a decision)
- **Raised by:** Agent R · P0 steps 1–4 · **Sections:** architecture §11.1, §12; WORKFLOW.md §5; contract/CHANGES.md
- **Pros:** Unblocks the Settings screen (§12) and the §7.4 runtime recommender swap; B-06
  cannot ship without a write path; GET already has a cousin in `/health` ("recommender in
  use"). A small `{recommender, model_id, strict_mode}` object is enough for the screen.
- **Cons:** Not in §11.1, so this expands the freeze. Settings are process state the §4
  fold cannot reconstruct from a session log. A mid-session POST could change later
  `RecommendationIssued.source` values with no rule for open sessions. `/health` already
  exposes the current recommender; a read-only Settings page plus a boot flag would cover
  the demo with no write endpoint. The proposed enum (`rules` | `local_llm` | `hosted_llm`)
  is not named in §11.1.
- **Status:** decided. CHANGE-001 rejected by Driver A (read-only `/health` + boot flag).

### Q-003 / CHANGE-002 · Driver note (neutral; not a decision)
- **Raised by:** Agent R · P0 steps 1–4 · **Sections:** architecture §4, §11.1; contract/CHANGES.md
- **Pros:** Maps the command-handler rejects in §4 to something B can render. The listed
  codes (`outcome_requires_actor`, `close_without_outcome`, `purpose_required_on_opener`,
  `purpose_not_allowed`, `session_closed`, `scenario_on_live_session`) match the invariants
  §4 already names. Splitting 409 (semantic reject) from 422 (malformed) is a usual FastAPI
  split.
- **Cons:** Architecture specifies neither status nor body. The code list is "such as", so
  A and B can still drift. 409 vs 400 vs 403 for "session closed" / "purpose required" is
  an unstated product choice. B must handle two envelopes. A single 400 with the same
  `{error: {code, message}}` would be smaller. No fixture today exercises a reject.
- **Status:** decided. CHANGE-002 accepted by Driver A with an exhaustive `code` enum.

### Q-004 · SessionState schema vs §11.2
- **Raised by:** Agent R · P0 step 2 · **Sections:** architecture §11.2; contract/session_state.schema.json
- **Detail:** Field-for-field the required keys match the §11.2 example (`session_id`,
  `mode`, `answers`, `library_version`, `stated_purpose`, `risk.*`, `question`, `stop`,
  `talk_track`, `suggested_outcome`, `available_outcomes`). Mismatches: (1) `debug` is
  optional and an unconstrained `object`; §11.2 names `recommender`, `latency_ms`,
  `rejections`. Optional is consistent with "dropped in production", the open shape is
  not. (2) Schema cannot express "question is null only on a hard stop" or "reasons share
  the level's direction". (3) Schema adds `score` bounds `[-45, 100]` and `answers`
  maximum 7, which §11.2 does not state. (4) §11.2 says the example *is* T2 after its
  second answer; `contract/fixtures/T2.json` at answers=2 differs (`mode` practice vs
  live, `question.source` rules vs model, `debug.recommender` rules vs local_llm,
  `latency_ms` 0 vs 640).
- **Recommended:** Constrain `debug` to `{recommender, latency_ms, rejections}` and treat
  `reference_impl.py` as source of truth for T2; leave cross-field rules to the checker.
- **Status:** answered: Driver A accepted recommendation.

### Q-005 · SessionState is not enough to render the Interview
- **Raised by:** Agent R · P0 step 2/3 · **Sections:** architecture §11.2, §12; contract/session_state.schema.json
- **Detail:** §11.2: one response contains everything the Interview needs; the frontend
  does no stitching. §11.1/§12 also say the frontend renders copy from `GET /library`.
  SessionState has no observed context chips, no context-chip catalog, no purpose-category
  row, no answer-chip labels, no `amount_band`, no outcome/closed/actor, and no
  undo-available flag. Either §11.2 is overstated (Interview = SessionState + library +
  client memory) or those fields are missing from the schema.
- **Recommended:** Treat Interview as SessionState + `GET /library` + the client's last
  posted chips/purpose; do not add those fields to SessionState in v1.
- **Status:** answered: Driver A accepted recommendation.

### Q-006 · Untyped endpoints and missing request enums
- **Raised by:** Agent R · P0 step 2 · **Sections:** architecture §11.1; contract/api.md
- **Detail:** `api.md` matches the §11.1 table. Neither gives a schema for `GET
  /sessions/{id}/handoff` ("manager summary projection"), `GET /sessions` (history list),
  or `GET /health` (recommender, model ID, last p95, fallback rate, agreement rate).
  Request bodies are prose only: no `amount_band` enum (fixtures use `5000_9999`), no
  `outcome`/`actor`/`chip` enums, no `scenario_id` field documented on `POST /sessions`
  even though live mode must reject it. B cannot build handoff, history, or health from
  the contract as frozen.
- **Recommended:** Add request/response schemas for handoff, history, health, and POST
  enums in a follow-up CHANGE; do not block session or interview work.
- **Status:** deferred: follow-up CHANGE.

### Q-007 · library.schema.json is a display subset of §5
- **Raised by:** Agent R · P0 step 2 · **Sections:** architecture §5; contract/library.schema.json
- **Detail:** Against §5 the schema keeps labels and drops the fold's facts. Missing from
  patterns: `name` (renamed `label`), `cover_story`, `enabled`, `signals`, `talk_track`,
  nested `look_alikes`. Missing from look-alikes: `description`, `confirmed_by`,
  `refuted_by`, `verifying_questions` (flattened to `id`, `label`, `pattern`). Missing
  from questions: `records_purpose`, `fixed_opener`, `pattern`, `tests`, `asserts_on`,
  `generic` (§5.4). Missing from signals: `family`, `weight`, `requires_interview`;
  `sig.*` and `mit.*` are one array with `direction`. Missing from purposes: the §5.3
  route-to-pattern / verify-look-alike columns. Extra: `copy_status`. Naming split:
  library `role` vs SessionState `stage`. Fine for a UI projection; not a §5 Library the
  fold can use.
- **Recommended:** Keep `library.schema.json` as the UI projection; the fold uses the
  backend library, not this schema.
- **Status:** answered: Driver A accepted recommendation.

### Q-008 · Sample library.json covers two of five §5.3 patterns
- **Raised by:** Agent R · P0 step 2 · **Sections:** architecture §5.3; contract/library.json
- **Detail:** Purposes include all eight categories. Patterns/look-alikes only have
  `pat.home_repair` / `look.contractor_with_estimate` and `pat.bank_impersonation` /
  `look.own_account_transfer`. Missing: `pat.government_impersonation` /
  `look.official_fine_payment`, `pat.family_emergency` / `look.relative_spoken_directly`,
  `pat.tech_support` / `look.known_repair_shop`. Question bank is six items. Schema does
  not require the five must-have patterns. A fold that only loads `library.json` cannot
  route those purposes.
- **Recommended:** Treat `contract/library.json` as T1–T7 display copy, not the full §5
  must-have set; A loads the real library.
- **Status:** answered: Driver A accepted recommendation.

### Q-009 · Events without API surface; fixtures omit undo, outcome, live
- **Raised by:** Agent R · P0 step 2 · **Sections:** architecture §4, §11.1; contract/events.md; contract/api.md; contract/fixtures
- **Detail:** `events.md` restates the §4 union (types, undo-as-pop, what moves the
  score, fold is total). It drops the §4 type annotations (`mode`, `AnswerChip`,
  `PurposeId`, outcome, `source`). `seq` is required by `Truncated(to_seq)` but is not a
  field on the union in either document. `ValidationRejected` is stored while §4 also
  says the handler rejects before append — same tension in both, not a contract drift.
  No endpoint for `SessionClosed` or `ManagerRequested`. No fixture step hits `undo`,
  `outcome`, `note`, `mode=live`, `scenario_id` rejection, or any error. CHANGE-000's
  combined `stop.reason` appears in T1's last step as specified.
- **Recommended:** Append `SessionClosed` after a valid `POST /outcome` and
  `ManagerRequested` on `GET /handoff`; add undo/outcome/live fixtures after A-04.
- **Status:** deferred: A-04 — event-append rules recorded in `events.md` / `api.md`;
  undo/outcome/live fixtures wait because `reference_impl.py` cannot emit those traces.

### Q-010 · B check: T1.json and T3.json cannot stand alone
- **Raised by:** Agent R · P0 step 3 · **Sections:** architecture §11.2, §12; contract/fixtures/T1.json; contract/fixtures/T3.json
- **Detail:** Stepping every T1/T3 response, a UI **can** paint from SessionState:
  shown/raw level, score, reasons, counterpoint, pattern_label, question text/why/kind/
  stage/source, stop kind+reason, talk_track lines/avoid, suggested vs available
  outcomes, mode, session_id, library_version, debug. T3's last step correctly keeps
  `question` under a recommended stop; T1's last step nulls it under a hard stop.
  A UI **cannot** paint from the fixtures alone: (1) answer-chip labels
  (`specific` / `denied` / … have no copy); (2) the eight purpose categories and labels
  for the two-tap opener; (3) the context-chip catalog; (4) which of `chip.cash_only` /
  `chip.on_phone` stay selected after `POST /context` — reasons show signals, not chip
  ids; (5) undo availability after the context-only step (`answers` is still 0);
  (6) `amount_band`; (7) teller-facing stop copy — §8.4/§12 want "You have enough to
  decide, or ask one more"; `stop.reason` is `enough to escalate` / `enough to proceed;
  nothing left to ask`; (8) that the opener records purpose, unless B special-cases
  `stage=opener` or `q.purpose.open`; (9) outcome/closed/finish confirmation; (10) the
  LIVE badge path — both fixtures are `practice`. Handoff, history, settings, and health
  have no fixture at all.
- **Recommended:** B loads chip/purpose labels from `GET /library` and keeps posted
  context chips in client memory; leave `stop.reason` machine-readable.
- **Status:** answered: Driver A accepted recommendation.

### Q-011 · A check: fold gaps for SessionState
- **Raised by:** Agent R · P0 step 4 · **Sections:** architecture §4, §8.4, §11.2; contract/session_state.schema.json; contract/events.md
- **Detail:** Given live events plus a **full §5** library, these fields are a pure
  fold: `mode`, `answers` (live `AnswerRecorded` count), `library_version`,
  `stated_purpose`, `risk.*` (evidence from `ContextAdded` / `AnswerRecorded` /
  `ModelSignal`, hysteresis by folding prefixes), `stop` (§8.4 on raw level),
  `talk_track`, `suggested_outcome` (shown level; never `report`),
  `available_outcomes` (constant), `question` on the rules path, `debug.latency_ms`
  and `debug.rejections` from `RecommendationIssued` / `ValidationRejected`.
  Gaps: (1) `session_id` is not on any §4 event. (2) `debug.recommender` / strict
  mode are settings, not log facts — at answers=0 fixtures still emit
  `recommender: "rules"` with no `RecommendationIssued`. (3) `contract/library.schema.json`
  cannot feed the fold (no weights, `asserts_on`, `tests`, characteristic signals,
  refuters, purpose routing). (4) After `Truncated`, a model-chosen next question
  needs a new `RecommendationIssued`; the fold cannot re-run the model (§4).
  (5) Observed chips, `amount_band`, notes, outcome, actor, closed are in the log
  and are not projected. (6) `seq` is implied, not declared.
- **Recommended:** `session_id` is store-assigned; `debug.recommender` is process
  settings (boot + `/health`); the model re-issues after undo; do not project
  notes/outcome onto SessionState in v1.
- **Status:** answered: Driver A accepted recommendation.

### Q-012 · §12 does not name the eight UI routes
- **Raised by:** B1 · B-01 · **Sections:** architecture §12; contract/api.md; CHANGE-001; Q-006
- **Detail:** §12 says "Eight routes matching draft §8" and does not list paths. The draft is not in the repo. contract-v1 names HTTP resources, not screen paths. CHANGE-001 rejected `GET`/`POST /settings`. Q-006 left handoff, history, and health response schemas as a follow-up CHANGE.
- **What B1 shipped inside web/ (not a contract edit):** `/` Home, `/sessions/:id/context` Context, `/sessions/:id` Interview, `/sessions/:id/outcome` Outcome, `/sessions/:id/handoff` Handoff, `/sessions` History, `/health` Health, `/settings` Settings. The Settings screen does not call `/settings`. Handoff, history, and health do not call those endpoints and do not invent response bodies. The mock replays only `GET /library`, `POST /sessions?case=`, `GET /sessions/:id`, `POST .../context`, `POST .../answers`, and `POST .../undo`.
- **Answer:** Driver A (Sebastian) confirms these eight paths as written, 2026-10-24.
- **Status:** answered / confirmed by Driver A. `/settings` is a UI page only and
  makes no API calls (CHANGE-001 rejected; PR #5); flagged for Driver B to confirm
  that page.

### Q-013 · B-025 optional explanation, context source, and activity feed
- **Raised by:** B1 · [B-025](B_TO_A.md) · **Sections:** architecture §4, §11.1, §11.2, §14.2; contract/session_state.schema.json; contract/events.md; contract/api.md; WORKFLOW.md §5
- **Detail:** B-025 (workstation UI) asks for three optional, additive contract
  pieces so the copilot strip and core-banking panel can survive reload without
  inventing fields in `web/`: (a) optional `explanation` on SessionState
  (`confidence`, `used_fallback`, per-signal `contributions`); (b) optional
  `source: "observed"|"teller"` on `ContextAdded`, echoed on SessionState context
  chips; (c) read-only `GET /sessions/{id}/activity` of structured rows (no free
  text, not fed to the model or scorer). None of the three are implemented. All
  three are backward compatible (absent/null on old fixtures; `source` defaults
  to `"teller"`). WORKFLOW.md §5 allows at most two changes after hour 4;
  CHANGE-004 already used one slot, so the three B-025 items are bundled as a
  single CHANGE-005 (one rebase for both agents). Driver A (Sebastian) accepted
  all three on Sat Oct 24, 2026, 8:45 PM ET. This is WORKFLOW.md §5 steps 1–3
  (request + CHANGE entry). Driver B approval is still pending; R applies only
  after both approve. Do not edit schemas, fixtures, `CONTRACT_VERSION`,
  `api/`, `engine/`, `web/`, `reference_impl.py`, or goldens in the request PR.
- **Status:** answered: accepted by Driver A; CHANGE-005 drafted

### Q-014 · Scenario-specific read-aloud scripts cannot ship without a fixture / §7.1 change
- **Raised by:** Agent A · stress-test (contractor / romance / government-impersonation
  demo visits) · **Sections:** architecture §5.2–§5.3, §6.2–§6.3, §7.1, §9;
  `library/talk_tracks.yaml`; `engine/rules.py` `talk_track_for`;
  `tests/golden/test_traces.py`; `contract/fixtures/T1–T7.json`;
  `scripts/gen_fixtures.py` `TALK_TRACKS`; WORKFLOW.md §5
- **Detail:** The three simulated customers all land at Caution with `risk.pattern`
  null. `talk_track_for` then emits only the Caution stage track `tt.slow_down`
  (the three generic lines about calls / a cashier's check / calling back on a
  known number). Pattern lines are appended only while a pattern is displayed
  (§7.1). These visits post context chips only, so the §7.1 display gate never
  fires (it needs an interview signal of the top pattern's own).
  `pat.government_impersonation`, `pat.family_emergency`, and `pat.tech_support`
  are compliance stubs with `signals: []` and no `talk_track`. Context chips
  overlap across the three families, so they cannot route distinct copy. Stated
  purpose is allowed to route questions and nothing else (§5.3) and the demo
  visits do not post a purpose.
- **Why a library-only add is not an implementation:** New `tt.*` rows are
  schema-valid and would not fail goldens *if unused*. They stay unused:
  `talk_track_for` will not select them without a displayed pattern, and those
  stub patterns can never display. Changing the existing `tt.slow_down` lines,
  or appending family lines from purpose / chips / a new selector, changes
  `SessionState.talk_track` on T1–T7 Caution steps.
  `test_project_matches_t1_through_t7_fixtures` asserts exact `talk_track`
  equality; `scripts/check_contract.py` requires fixtures to match
  `scripts/gen_fixtures.py` (which hard-codes `TALK_TRACKS`). Weights-frozen; do
  not edit goldens, `contract/`, or `reference_impl.py` outside the protocol. No
  engine/library code change in this request.
- **Smallest change-protocol request (scripts):** If drivers want distinct
  read-aloud copy per family on these observation-only visits, one CHANGE that
  (1) amends §7.1 so family lines may attach from stated purpose (copy routing
  only; still never score or displayed pattern) and notes the §5.3 "does nothing
  else" sentence; (2) adds DRAFT `tt.government_impersonation` /
  romance-or-`tt.family_emergency` / richer contractor lines in
  `library/talk_tracks.yaml` (`copy_status` stays the compliance-review banner);
  (3) lets `talk_track_for` append the purpose-routed track even when
  `risk.pattern` is null; (4) has R regenerate T1–T7 fixtures (every post-opener
  Caution/High step that already has `purpose.home_repair` or
  `purpose.moving_money` picks up extra lines) and rehash oracles if §7.1 text
  in `docs/architecture.md` is an oracle. The workstation must also post a
  purpose (or a new non-scoring family id) on the three demo visits — context
  chips alone cannot tell them apart. WORKFLOW.md §5 budget of two post-hour-4
  changes is already used (CHANGE-004, CHANGE-005); this needs an explicit extra
  slot.
- **Not requested / do not apply:** Invent characteristic signals for the three
  stub patterns; edit `tt.slow_down` in place; change weights or levels; edit
  goldens or `contract/` in this PR.
- **Government-impersonation Caution / 45** is the §6.2 observation cap, not a
  missing weight. Full arithmetic is in the PR body. Smallest *protocol* item to
  make that *observation-only* visit read a higher **score** (still Caution):
  raise `observation_cap` 45 → ≥52 (oracles: §6.2, `reference_impl.py`,
  `tests/golden/reference_weights.yaml`, `contract/oracle.sha256`). Smallest
  protocol item to make it **High** from observation alone: raise that cap to
  ≥60 and drop the High interview-gate invariant. Neither is a weight change. A
  teller `confirmed` on `q.secrecy.told_not_to_tell` (`sig.secrecy_bank`) lifts
  the cap inside the current formula (raw 62 → High) with no protocol;
  `sig.answer_relayed` does not (third_party already at +22, score 52, still
  Caution).
- **Status:** open — no code until drivers answer

### Q-015 · Expose §6.3 score cutoffs for Technical details
- **Raised by:** Driver request (Technical details cutoffs) · **Sections:**
  architecture §6.3, §9, §11.1, §12; `engine/score.py` `level()` / `CAUTION` /
  `HIGH`; `contract/api.md` `GET /health`; WORKFLOW.md §5
- **Detail:** The workstation Technical details section must list the inclusive
  0–100 bands that map Urgency Score onto Clear / Caution / High concern. Those
  numbers already live in `engine.score` (`CAUTION=25`, `HIGH=60`, clamp +100)
  and must not be hardcoded in `web/`. SessionState and `GET /library` do not
  carry them. `GET /health` is the existing untyped read-only config view
  (CHANGE-003 / Q-006 deferred its schema).
- **Resolution:** CHANGE-006. Additive optional `level_bands` on `GET /health`.
  No SessionState field, no fixture regen, no `CONTRACT_VERSION` bump, no
  golden / `reference_impl.py` / weights-frozen edit. Health schema stays
  deferred. WORKFLOW.md §5's two post-hour-4 slots are already used
  (CHANGE-004, CHANGE-005); this is an extra additive slot on an untyped
  endpoint because a required SessionState field cannot be done without
  touching frozen fixtures.
- **Status:** answered: applied as CHANGE-006

---
