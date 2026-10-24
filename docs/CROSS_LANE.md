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

## A → B (B to check)

A reports problems in B's work. Driver B triages.
