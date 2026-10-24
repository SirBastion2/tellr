# R-review · Phase-end review checklist

**Agent R, in a fresh chat in the `main` window, for every PR.** Use ECC's `code-reviewer` agent, and
`security-reviewer` for anything touching `api/` or `recommenders/`.

```bash
B=agent-a   # or agent-b
git fetch && git diff --stat main...$B
git diff main...$B -- contract/ reference_impl.py docs/architecture.md tests/golden/reference_weights.yaml
```

## Checklist

- [ ] The diff touches only the owner's directories, plus `docs/HANDOFF.md` and `docs/QUESTIONS.md`.
- [ ] The second command prints nothing, unless an approved `CHANGE-nnn` explains it.
- [ ] The branch is rebased on `main` and its gate passes (`scripts/gate.sh a` or `b`).
- [ ] No golden expectation was edited; no test was weakened (new `skip`/`xfail`, loosened
      assertion, deleted case).
- [ ] Architecture §9 spot checks:
  - `grep -rniE "\b(age|dob|birth|appearance|elderly)\b" engine api library web/src` finds no field;
  - the prompt builder reads an allowlist and never reads notes;
  - `web/` contains no risk arithmetic (no thresholds 25/60, no weights, no level logic);
  - no outcome button is ever `disabled`;
  - model output is parsed as a question ID and nothing else.
- [ ] The HANDOFF entry exists and matches the diff.
- [ ] Every new dependency is justified in HANDOFF.

## Verdict

**Merge**, or **changes requested**, with `file:line` for each.
