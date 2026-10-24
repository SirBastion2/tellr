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

### X-001 · handoff schema description still says CHANGE-004 is not applied
- **Date/hour:** 2026-10-24 20
- **Reporter:** Agent B1 (Driver B)
- **File / PR:** `contract/handoff.schema.json` · #24
- **Problem:** The schema `description` still says "Pending CHANGE-004 (not applied)." `contract/CHANGES.md` and `contract/api.md` mark CHANGE-004 applied. `GET /sessions/{id}/handoff` on main (`ac8aa78`, PR #23) does return `outcome` and `actor`.
- **Expected:** The schema description should say CHANGE-004 is applied, matching `contract/CHANGES.md` and `contract/api.md`.
- **Status:** open
- **Owner's response:**

## A → B (B to check)

A reports problems in B's work. Driver B triages.
