# CP3 GPU arm-C run (Driver B)

**On hold** until Driver B reports GPU access is back in `docs/B_TO_A.md` (team is moving; RTX 5070 laptop may be unavailable). Do not start this run until that reply is posted.

A3 already ran arms A/B/C with `--model fake` (no GPU). This run is the official CP3 arm-C number: 8B Q4_K_M on the GPU laptop. Driver B should not open `eval/scenarios/dev/` YAML (`docs/ROSTER.md` §2); run the commands as written.

## Setup

1. Pull the commit that added this file (or later main).
2. Start `llama-server` with the 8B Q4_K_M (same flags as A-03 / A-05): `-ngl 99 -c 4096 -np 1`, listen on `127.0.0.1:8080`.
3. One GPU job at a time. Git Bash / WSL: use `scripts/with-gpu`. Native Windows (cmd/PowerShell): skip the wrapper and run the inner command directly (`scripts/with-gpu` is bash/`flock` only).

## Command

From the repo root. Replace nothing except the shell if you are on PowerShell.

Git Bash / WSL:

```
scripts/with-gpu env LLAMA_SERVER=http://127.0.0.1:8080 \
  MODEL_ID=Meta-Llama-3.1-8B-Instruct-Q4_K_M \
  python -m eval.run --scenarios eval/scenarios/dev \
  --out eval/results/$(git rev-parse HEAD) \
  --arms A,B,C --model local
```

Native Windows PowerShell (no `scripts/with-gpu`):

```
$env:LLAMA_SERVER='http://127.0.0.1:8080'
$env:MODEL_ID='Meta-Llama-3.1-8B-Instruct-Q4_K_M'
python -m eval.run --scenarios eval/scenarios/dev --out ("eval/results/" + (git rev-parse HEAD)) --arms A,B,C --model local
```

Stdout should end with: `wrote eval/results/<sha>/results.json and report.md (30 scenarios)`.

## Expected output path

`eval/results/<git-sha>/results.json` and `eval/results/<git-sha>/report.md`

`<git-sha>` is `git rev-parse HEAD` of the tree you ran. `eval/results/` is gitignored; do not commit it.

## What to paste back

In `docs/B_TO_A.md` (new entry) and/or a new `docs/handoff/<yyyymmdd-hhmm>-<short-branch-slug>.md` (do not edit `docs/HANDOFF.md`):

- the exact `git rev-parse HEAD` you ran
- from `report.md`, the **Arm C** block: confusion matrix, catch, false-flag, friction, misses, questions to decision, `default_fired_rate`, validator rejections, Wilson intervals
- llama-server flags, VRAM, and whether any turn fell back because the server was down

Do not rerun to chase a better number. One run is the CP3 figure.
