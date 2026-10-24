# Writeup numbers

Counts only. No significance claims. J-01 steps 3–4 (ROSTER A3 hours 21–24).
Sources: `eval/results/heldout/report.md`; HANDOFF A-08, A-07, and the CP3 (B-013) record in HANDOFF.

## 1. Held-out, 5 per population, wide intervals

Copied exactly from `eval/results/heldout/report.md` (`## held-out, 5 per population, wide intervals`).

### Arm A

- Catch rate: `4/5` (95% Wilson 38–96%)
- False-flag rate: `1/5` (95% Wilson 4–62%)

### Arm B

- Catch rate: `4/5` (95% Wilson 38–96%)
- False-flag rate: `0/5` (95% Wilson 0–43%)

### Arm C

- Catch rate: `4/5` (95% Wilson 38–96%)
- False-flag rate: `0/5` (95% Wilson 0–43%)

## 2. Dev set (30 scenarios, CP3 from B-013) and A-07 arm A

30 development scenarios. CP3 recorded before A-07 (threshold still 3).

| Arm | Catch | False-flag | Questions (mean) |
|---|---|---|---|
| A (CP3, threshold 3) | `15/15` | `8/15` (95% Wilson 30–75%) | 6.00 |
| B (CP3) | `14/15` (95% Wilson 70–99%) | `0/15` (95% Wilson 0–20%) | 3.07 |
| C (CP3, live 8B) | `14/15` (95% Wilson 70–99%) | `0/15` (95% Wilson 0–20%) | 3.10 |

A-07 before/after for arm A only (threshold 3 → 4, labelled tuned):

| Arm A | Catch | False-flag |
|---|---|---|
| before (threshold 3) | `15/15` | `8/15` |
| after (threshold 4) | `13/15` | `0/15` |

## 3. Arm B versus arm C (architecture §19.1)

Identical catch and false-flag on both sets. The model (C) did not beat the rule engine (B).

| Set | Catch B / C | False-flag B / C | Questions mean B / C |
|---|---|---|---|
| Dev (30, CP3) | `14/15` / `14/15` | `0/15` / `0/15` | 3.07 / 3.10 |
| Held-out (10) | `4/5` / `4/5` | `0/5` / `0/5` | 2.30 / 2.30 |

## 4. Misses by id

**Dev**

- `scn.coached.bank_perfect_own_account` — miss on arm B and arm C (CP3 and A-07). Arm A caught it at threshold 3 and at threshold 4.
- `scn.coached.gov_perfect_fine` — miss on arm A after A-07 (threshold 4).
- `scn.coached.tech_refund_perfect` — miss on arm A after A-07 (threshold 4).

**Held-out**

- `scn.coached.ssa_review_rehearsed` — missed by all three arms (coached finishing Clear).
- `scn.legitimate.shelter_adoption_fuzzy` — arm A false-flag (legitimate finishing High). Arms B and C: Clear.

## 5. Arm C latency and fallback_rate

From `eval/results/heldout/report.md`, Arm C headlines:

- Latency p50/p95/max: 354 / 405 / 410 ms
- fallback_rate: 0/13

## 6. Architecture §18.14 claims

Cite a number from `eval/results/heldout/report.md`, or mark **remove**. The report has eval counts only.

| Claim (§18.14) | From the report | Writeup |
|---|---|---|
| The AARP figure in draft §2 and its year | — | remove |
| The Cuyahoga County Scam Squad pilot details and its $5,000 threshold (draft §2, cited as July 2026) | — | remove |
| The August 2026 Ohio coaching coverage (draft §16) | — | remove |
| The precise scope of Senior Safe Act immunity as paraphrased in draft §7.7, particularly which staff count as trained and which recipients are covered | — | remove |
