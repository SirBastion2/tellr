# P0 · Contract freeze

**Agent R drives (Agent A if you only have two); Agent B reviews in parallel · hours 0–2** · depends on the kit as shipped

**Read only:** architecture §4, §5, §8.4, §11, §12 · all of `contract/` · WORKFLOW.md §5

## Goal

Freeze the A/B interface so both agents can work independently for six hours. Everything after this depends on it, which is why it is the only serialized phase (architecture §17).

## You may create or edit

- `contract/**`
- `docs/QUESTIONS.md`
- `docs/DECISIONS.md`

## Steps (tests first)

1. Run `python3 scripts/check_contract.py`. It must pass on the kit as shipped.
2. Review `contract/session_state.schema.json` against architecture §11.2 field by field, `contract/api.md` against §11.1, `contract/events.md` against §4, and `contract/library.schema.json` against §5. Log every mismatch in `docs/QUESTIONS.md`. Do not fix silently.
3. **Agent B, in parallel:** step through `contract/fixtures/T1.json` and `T3.json` and list anything the UI cannot render from them alone (missing labels, ambiguous fields).
4. **Agent A, in parallel:** confirm every field of `SessionState` is computable by the fold in §4 with no extra state. List anything that isn't.
5. Drivers decide CHANGE-001 (settings endpoint) and CHANGE-002 (error shape) and record both in `docs/DECISIONS.md`. Apply accepted changes to `contract/api.md` and the schemas.
6. Regenerate and re-check: `python3 scripts/gen_fixtures.py && python3 scripts/check_contract.py --rehash && scripts/gate.sh contract`.
7. Commit, `git tag contract-v1`, and have both worktrees `git rebase main`.

## Done when

- [ ] `scripts/gate.sh contract` passes
- [ ] Tag `contract-v1` exists
- [ ] Both drivers' approval boxes are ticked in `contract/CHANGES.md`
- [ ] Every `docs/QUESTIONS.md` item is answered or explicitly deferred

## Hand off

Write a new file `docs/handoff/<yyyymmdd-hhmm>-<short-branch-slug>.md` (template in `docs/HANDOFF.md`; do not edit that pointer). **Checkpoint: stop here.**
