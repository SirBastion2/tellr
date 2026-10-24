# A-08 held-out run (Driver B)

**Run once.** Do not start until this file is on the tree you will run (A-08 PREP merged) and `eval/scenarios/heldout/` is present (B-07, commit `14bb1cd`, PR #58). This cloud VM has no GPU; arm C needs the local 8B on Driver B's GPU laptop.

**Hard rule: run once, no reruns, no edits after seeing results.** The result stands (architecture §13.4, WORKFLOW.md §10). Do not chase a better number.

Weights are those of tag `weights-frozen` (`82b788d`). Do not check out that tag alone: it has neither the held-out YAML nor the A-08 report label. Run on this PREP-merged tree (or later main that contains it). Confirm `git rev-parse weights-frozen` is `82b788d`. Driver B should not open `eval/scenarios/dev/` YAML (`docs/ROSTER.md` §2); run the commands as written.

## Setup

1. Pull the commit that added this file (or later main). Confirm:
   - `git rev-parse weights-frozen` starts with `82b788d` (full: `82b788d1009fe775c3fc5edb20cb5413ee25068e`)
   - `eval/scenarios/heldout/` has 10 YAML files (do not open them to "improve" anything)
   - B-07 isolation: commit `14bb1cd`, parent `82b788d`, only `eval/scenarios/heldout/`
2. Start `llama-server` with the 8B Q4_K_M (same flags as A-03 / A-05 / CP3): `-ngl 99 -c 4096 -np 1`, listen on `127.0.0.1:8080`.
3. One GPU job at a time. Git Bash / WSL: use `scripts/with-gpu`. Native Windows (cmd/PowerShell): skip the wrapper and run the inner command directly (`scripts/with-gpu` is bash/`flock` only).

## Command

From the repo root. Replace nothing except the shell if you are on PowerShell. This is the **only** command. All three arms, arm C with `--model local`, output to `eval/results/heldout/`.

Git Bash / WSL:

```
scripts/with-gpu env LLAMA_SERVER=http://127.0.0.1:8080 \
  MODEL_ID=Meta-Llama-3.1-8B-Instruct-Q4_K_M \
  python -m eval.run --scenarios eval/scenarios/heldout \
  --out eval/results/heldout \
  --arms A,B,C --model local
```

Native Windows PowerShell (no `scripts/with-gpu`):

```
$env:LLAMA_SERVER='http://127.0.0.1:8080'
$env:MODEL_ID='Meta-Llama-3.1-8B-Instruct-Q4_K_M'
python -m eval.run --scenarios eval/scenarios/heldout --out eval/results/heldout --arms A,B,C --model local
```

Stdout should end with: `wrote eval/results/heldout/results.json and report.md (10 scenarios)`.

`report.md` must contain the section heading `## held-out, 5 per population, wide intervals`.

## Expected output path

`eval/results/heldout/results.json` and `eval/results/heldout/report.md`

`eval/results/` is gitignored; force-add those two files when you commit. Do not edit them after you have seen the numbers.

## Commit steps

1. Confirm this was the only run. Do not rerun. Do not edit outputs.
2. `git add -f eval/results/heldout/results.json eval/results/heldout/report.md`
3. Append `docs/HANDOFF.md` using the checklist below (SHA + tag). Do not change results in that same edit pass beyond recording them.
4. `git commit -m "eval: held-out results (A-08, once)"`
5. Push. Stop.

## Checklist to record in docs/HANDOFF.md

- [ ] Exact `git rev-parse HEAD` of the tree that was run (full SHA)
- [ ] Tag `weights-frozen` = `82b788d` (`82b788d1009fe775c3fc5edb20cb5413ee25068e`)
- [ ] B-07 isolation commit `14bb1cd` (parent `82b788d`)
- [ ] Output path `eval/results/heldout/`
- [ ] The line: run once; no reruns; no edits after seeing results

## What to paste in docs/B_TO_A.md

New entry (newest first). Include:

- the exact `git rev-parse HEAD` you ran
- `weights-frozen` = `82b788d`
- from `report.md`, the **held-out, 5 per population, wide intervals** section: each arm's confusion matrix, catch, false-flag, friction, misses, questions to decision, `default_fired_rate`, validator rejections, Wilson intervals, latency p50/p95/max, `fallback_rate`
- llama-server flags, VRAM, and whether any turn fell back because the server was down

Do not rerun to chase a better number. One run is the A-08 figure.
