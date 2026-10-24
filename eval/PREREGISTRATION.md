# Evaluation pre-registration

**Status:** FROZEN at A-06 hours 6–8. This file is not a run and contains no
scores. It is committed alone, before any `eval/results/` (architecture §13.4,
card A-06 step 1, ROSTER hours 6–8). The commit order is the evidence it came
first.

Tuning freedom is symmetric across arms (§13.4). This freeze records arm A's
questions, polarity map, a prior threshold, and the metric definitions. A-07
may retune the threshold together with the weights on the 30 development
scenarios; that later figure is labelled tuned. Held-out numbers are the
honest check.

## Arms

| Arm | What it is |
|---|---|
| **A — Static** | Fixed yes/no sheet mapped to the same intents, scored by concerning-count against a threshold |
| **B — Rules-only** | Full product, `RuleEngine` as recommender |
| **C — Model-assisted** | Full product, `LocalLLM` |

## Arm A questions

Mapped to `contract/library.json` intents (and teller-observed context chips).
Arm A never reads free text.

### Interview items (keyed by intent)

| # | Intent | Library question | Kind |
|---|---|---|---|
| 1 | `purpose` | `q.purpose.open` | open |
| 2 | `counterparty_identity` | `q.homerepair.contractor_name` | open |
| 3 | `written_estimate` | `q.homerepair.estimate` | open |
| 4 | `receiving_account` | `q.recipient.account_details` | open |
| 5 | `secrecy` | `q.secrecy.told_not_to_tell` | yes_no |
| 6 | `payment_flexibility` | `q.alternative.cashiers_check` | yes_no |

Unmapped intents use the scenario `default` chip, same as arms B and C
(`default_fired_rate` is a reported metric, §13.1).

### Observational items (context chips present = yes)

| # | Context chip | Notes |
|---|---|---|
| 7 | `chip.on_phone` | |
| 8 | `chip.someone_directing` | |
| 9 | `chip.cash_only` | |
| 10 | `chip.urgency_secrecy` | |
| 11 | `chip.rushed` | |
| 12 | `chip.unusual_for_customer` | |

`chip.above_threshold` is the withdrawal trigger, not a concerning item
(architecture §18.6). It does not increment the yes-count.

## Chip → concerning mapping (polarity, §13.2)

A single global mapping is forbidden: `confirmed` is concerning on secrecy and
reassuring on payment flexibility.

### Open intents (`purpose`, `counterparty_identity`, `written_estimate`, `receiving_account`)

| Chip | Concerning? |
|---|---|
| `specific` | no |
| `vague` | yes |
| `no_answer` | yes |
| `changed` | yes |
| `relayed_by_caller` | yes |

### `secrecy`

| Chip | Concerning? |
|---|---|
| `confirmed` | yes |
| `denied` | no |
| `no_answer` | yes |
| `changed` | yes |
| `relayed_by_caller` | yes |

### `payment_flexibility` (reversed polarity)

| Chip | Concerning? |
|---|---|
| `confirmed` | no |
| `denied` | yes |
| `no_answer` | yes |
| `changed` | yes |
| `relayed_by_caller` | yes |

### Context chips

Present → concerning for items 7–12. Absent → not concerning.

An item the engine never asked, and whose intent is missing from `answers`,
contributes the scenario `default` through the open-intent table (usually
`vague` → concerning). Context items are not defaulted.

## Arm A threshold (prior)

**3** concerning items.

This is a prior, not a tuned value and not a result. If A-07 retunes it on the
30 development scenarios, report that number as tuned and keep this prior in
git history.

Scoring: count concerning interview answers (after defaulting) plus concerning
context chips. Arm A labels **High** at or above the threshold, **Clear**
below it. Arm A has no Caution band; the confusion-matrix Caution column is
empty for this arm until a run. That is a property of the sheet, not a
finding.

## Metric definitions (§13.3, §18.2)

Primary: full confusion matrix on the **final raw level** at stop, both
populations, all three levels. Thirty development scenarios: 15 coached and
15 legitimate. The matrix is not run yet.

Headline pair, as **counts**, never percentages:

- Catch rate: coached finishing at Caution or High, written like `13/15`
- False-flag rate: legitimate finishing at High, written like `1/15`

Secondary:

- Friction rate: legitimate finishing at Caution or above
- Misses: coached finishing at Clear, each listed by scenario id
- Questions to decision: mean and max
- Time to decision: questions × 13 s (live-path latency measured separately)
- Validator rejections and live-path fallback rate
- `default_fired_rate`

Trivial baselines, published next to the arms: always-Clear, always-Caution,
always-High.

Uncertainty: a 13/15 result has a 95% Wilson interval of roughly 62% to 96%.
Report `13/15`, not `86.7%`. Do not call an arm-C-minus-arm-B difference
significant on 15 scenarios. If that difference matters, list which scenarios
flipped.

## What this freeze does not decide

- Live weights (A1 / A-07)
- Held-out scenarios (H, card B-07)
- Arm C model choice (CP1)
- Any arm result, score, or confusion-matrix cell
