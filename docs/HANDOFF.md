# Handoff

Pointer only. Do not append to this file, and do not edit it in a feature PR.

Each PR adds its own new file:

`docs/handoff/<yyyymmdd-hhmm>-<short-branch-slug>.md`

The name is unique, so parallel PRs do not conflict. Do not edit another PR's file.

List `docs/handoff/` newest first. The `yyyymmdd-hhmm` prefix sorts in time order; read the latest names first. `000-archive.md` is the old shared log, moved here untouched. It sorts first and is not a new entry.

## Template

Copy this into the new file. One card or stop per file.

### [CARD] Title — Agent X — YYYY-MM-DD HH:MM
- **Status:** done | partial | blocked
- **Gate:** `scripts/gate.sh x` → PASS or FAIL (paste the last few lines)
- **Changed:** paths
- **Decisions I made, and the section that justified each:**
- **Questions logged:** Q-nnn
- **The next agent needs to know:**
