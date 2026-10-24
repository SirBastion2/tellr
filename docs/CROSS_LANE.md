# Cross-lane log

One lane records problems it finds in the other lane's work. **Log it; do not fix the other
lane's files yourself.** The owning driver triages at each phase end. Anything that changes the
contract or golden tests goes through `contract/CHANGES.md` instead. Spec ambiguities still go
in `docs/QUESTIONS.md`.

An agent that finds a problem in the other lane's work must log it here (this file is the
record) **and** call it out in its final report / `docs/HANDOFF.md` entry with the `X-id`, so
the driver hears about it. Do not report it only in chat.

Append-only, newest at the bottom. One entry per finding.

## Template

### X-nnn · short title
- **Date/hour:** YYYY-MM-DD HH
- **Reporter:** Agent X (Driver Y)
- **File / PR:** `path` · #nn
- **Problem:**
- **Expected:**
- **Status:** open | acknowledged | fixed in PR #nn | wontfix + reason
- **Owner's response:**

---

## B → A (A to check)

B reports problems in A's work. Driver A triages.

### X-001 · handoff missing outcome and actor
- **Date/hour:** 2026-10-24 20
- **Reporter:** Agent B (Driver B)
- **File / PR:** `GET /sessions/{id}/handoff` · #21 (B-03)
- **Problem:** The live handoff data did not include the recorded outcome or actor, so the Handoff screen could not show them.
- **Expected:** Handoff returns outcome and actor (null until recorded).
- **Status:** resolved
- **Owner's response:** A raised CHANGE-004 (PR #22, applied in PR #24, both drivers approved) and implemented it in PR #23; B should pull main and re-check the Handoff screen.

### X-002 · handoff schema description still says CHANGE-004 is not applied
- **Date/hour:** 2026-10-24 20
- **Reporter:** Agent B1 (Driver B)
- **File / PR:** `contract/handoff.schema.json` · #24
- **Problem:** The schema `description` still says "Pending CHANGE-004 (not applied)." `contract/CHANGES.md` and `contract/api.md` mark CHANGE-004 applied. `GET /sessions/{id}/handoff` on main (`ac8aa78`, PR #23) does return `outcome` and `actor`.
- **Expected:** The schema description should say CHANGE-004 is applied, matching `contract/CHANGES.md` and `contract/api.md`.
- **Status:** resolved · PR #27
- **Owner's response:** A: PR #27 is merged; the schema description now says "CHANGE-004 (applied)".

### X-003 · 8B cold-start timeout and Windows live-path blockers
- **Date/hour:** 2026-10-24 20
- **Reporter:** Agent B (Driver B)
- **File / PR:** `pyproject.toml` (`engine` omitted from `[tool.setuptools.packages.find]`), `api/main.py`, `scripts/with-gpu` · main `6890808` (A-05, PR #30)
- **Problem:**
  - (1) 8B cold start: first request after server start timed out at 1500 ms and fell back (T2 p95 1504 ms, >1.5 s, fallback 1.0); warm runs fine. Suggest a warm-up call at startup.
  - (2) Windows: `engine` package not included in package config (needed PYTHONPATH); api/main.py creates the app at import with default TELLER_DB=/tmp/teller-copilot.sqlite which fails on Windows; scripts/with-gpu is bash/flock-only so it was skipped on Windows (no other GPU users).
- **Expected:** The first live-path request after llama-server start stays inside 1500 ms (a warm-up call at startup). The live path is runnable on Windows without a manual PYTHONPATH, a `/tmp` default database path, or bash/flock.
- **Status:** fully resolved · Windows verified B-008 (#43); 8B cold start verified B-010 (#44)
- **Owner's response:** A: part 2 (Windows live path) is in merged PR #43 (`engine` package, tempdir default DB, `with-gpu` Windows note). Part 1 (8B cold-start warm-up) is in merged PR #44. B-008 (PR #45, and again in #47): Windows verified at `a7e189e` — `pip install -e .`, no `PYTHONPATH`, default DB `%TEMP%\teller-copilot.sqlite`, uvicorn starts, `/health` 200. B-010 (PR #47, not yet on main): first live call 370 ms, no fallback; T1–T7 p95 420 ms, fallback 0.0, agreement 0.909, VRAM 6246/8151 MiB. No further X-003 work.

### X-004 · GET /sessions?mode=all returns live sessions only
- **Date/hour:** 2026-10-24 22
- **Reporter:** Agent B (Driver B)
- **File / PR:** `api/main.py` (`list_sessions`), `store/sqlite.py` (`list_sessions`) · main `2181419`
- **Problem:** `GET /sessions?mode=all` is passed into the store as `mode=None`. The store treats `None` the same as `live`, so the body is live sessions only. `GET /sessions` and `GET /sessions?mode=live` are live-only, which matches §11.1. `GET /sessions?mode=practice` returns practice sessions. B-06 uses that query for the practice list (PR #55). A combined live-plus-practice list has no working query.
- **Expected:** `mode=all` returns live and practice rows. The default and `mode=live` stay live-only.
- **Status:** resolved · PR #57
- **Owner's response:** Fixed by A in #57 (b917657); mode=all now returns live and practice.

## A → B (B to check)

A reports problems in B's work. Driver B triages.
