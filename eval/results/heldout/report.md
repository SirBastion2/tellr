# Eval report

## held-out, 5 per population, wide intervals

- git: `82b788d1009fe775c3fc5edb20cb5413ee25068e`
- library_version: `1.2.0`
- config: temperature 0, batch size 1, prefetch off, timeout off (§13.4)

Counts, not percentages. Wilson intervals are 95%. Do not call an arm difference significant on 15 scenarios (§13.3).

## Arm A

### Confusion matrix

| | Clear | Caution | High |
|---|---:|---:|---:|
| coached (5) | 1 | 0 | 4 |
| legitimate (5) | 4 | 0 | 1 |

### Headlines

- Catch rate: `4/5` (95% Wilson 38–96%)
- False-flag rate: `1/5` (95% Wilson 4–62%)
- Friction rate: `1/5`
- Questions to decision: mean 6.00, max 6
- Time to decision (scripted): mean 78s, max 78s (questions × 13s)
- default_fired_rate: 0/60
- Validator rejections: 0
- Latency p50/p95/max: n/a
- fallback_rate: n/a

Misses (coached finishing Clear):

- `scn.coached.ssa_review_rehearsed` — Coached — Social Security review, rehearsed plausible details

### Per scenario

| id | population | raw | questions |
|---|---|---|---:|
| `scn.coached.bank_impersonator_cruise_cover` | coached | High | 6 |
| `scn.coached.jury_summons_cash` | coached | High | 6 |
| `scn.coached.relative_hospital_caller` | coached | High | 6 |
| `scn.coached.ssa_review_rehearsed` | coached | Clear | 6 |
| `scn.coached.tech_support_posed_as_fine` | coached | High | 6 |
| `scn.legitimate.building_permit_counter` | legitimate | Clear | 6 |
| `scn.legitimate.cemetery_memorial_invoice` | legitimate | Clear | 6 |
| `scn.legitimate.dealer_trailer_stock_number` | legitimate | Clear | 6 |
| `scn.legitimate.reunion_spouse_on_phone` | legitimate | Clear | 6 |
| `scn.legitimate.shelter_adoption_fuzzy` | legitimate | High | 6 |

### Trivial baselines

- always-Clear: catch `0/5`, false-flag `0/5`, friction `0/5`
- always-Caution: catch `5/5`, false-flag `0/5`, friction `5/5`
- always-High: catch `5/5`, false-flag `5/5`, friction `5/5`

## Arm B

### Confusion matrix

| | Clear | Caution | High |
|---|---:|---:|---:|
| coached (5) | 1 | 0 | 4 |
| legitimate (5) | 5 | 0 | 0 |

### Headlines

- Catch rate: `4/5` (95% Wilson 38–96%)
- False-flag rate: `0/5` (95% Wilson 0–43%)
- Friction rate: `0/5`
- Questions to decision: mean 2.30, max 3
- Time to decision (scripted): mean 30s, max 39s (questions × 13s)
- default_fired_rate: 0/23
- Validator rejections: 0
- Latency p50/p95/max: n/a
- fallback_rate: n/a

Misses (coached finishing Clear):

- `scn.coached.ssa_review_rehearsed` — Coached — Social Security review, rehearsed plausible details

### Per scenario

| id | population | raw | questions |
|---|---|---|---:|
| `scn.coached.bank_impersonator_cruise_cover` | coached | High | 3 |
| `scn.coached.jury_summons_cash` | coached | High | 2 |
| `scn.coached.relative_hospital_caller` | coached | High | 3 |
| `scn.coached.ssa_review_rehearsed` | coached | Clear | 2 |
| `scn.coached.tech_support_posed_as_fine` | coached | High | 2 |
| `scn.legitimate.building_permit_counter` | legitimate | Clear | 2 |
| `scn.legitimate.cemetery_memorial_invoice` | legitimate | Clear | 2 |
| `scn.legitimate.dealer_trailer_stock_number` | legitimate | Clear | 2 |
| `scn.legitimate.reunion_spouse_on_phone` | legitimate | Clear | 3 |
| `scn.legitimate.shelter_adoption_fuzzy` | legitimate | Clear | 2 |

### Trivial baselines

- always-Clear: catch `0/5`, false-flag `0/5`, friction `0/5`
- always-Caution: catch `5/5`, false-flag `0/5`, friction `5/5`
- always-High: catch `5/5`, false-flag `5/5`, friction `5/5`

## Arm C

### Confusion matrix

| | Clear | Caution | High |
|---|---:|---:|---:|
| coached (5) | 1 | 0 | 4 |
| legitimate (5) | 5 | 0 | 0 |

### Headlines

- Catch rate: `4/5` (95% Wilson 38–96%)
- False-flag rate: `0/5` (95% Wilson 0–43%)
- Friction rate: `0/5`
- Questions to decision: mean 2.30, max 3
- Time to decision (scripted): mean 30s, max 39s (questions × 13s)
- default_fired_rate: 0/23
- Validator rejections: 0
- Latency p50/p95/max: 354 / 405 / 410 ms
- fallback_rate: 0/13

Misses (coached finishing Clear):

- `scn.coached.ssa_review_rehearsed` — Coached — Social Security review, rehearsed plausible details

### Per scenario

| id | population | raw | questions |
|---|---|---|---:|
| `scn.coached.bank_impersonator_cruise_cover` | coached | High | 3 |
| `scn.coached.jury_summons_cash` | coached | High | 2 |
| `scn.coached.relative_hospital_caller` | coached | High | 3 |
| `scn.coached.ssa_review_rehearsed` | coached | Clear | 2 |
| `scn.coached.tech_support_posed_as_fine` | coached | High | 2 |
| `scn.legitimate.building_permit_counter` | legitimate | Clear | 2 |
| `scn.legitimate.cemetery_memorial_invoice` | legitimate | Clear | 2 |
| `scn.legitimate.dealer_trailer_stock_number` | legitimate | Clear | 2 |
| `scn.legitimate.reunion_spouse_on_phone` | legitimate | Clear | 3 |
| `scn.legitimate.shelter_adoption_fuzzy` | legitimate | Clear | 2 |

### Trivial baselines

- always-Clear: catch `0/5`, false-flag `0/5`, friction `0/5`
- always-Caution: catch `5/5`, false-flag `0/5`, friction `5/5`
- always-High: catch `5/5`, false-flag `5/5`, friction `5/5`

