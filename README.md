<p align="center"><img src="docs/assets/tellr-logo.png" alt="Tellr" width="260"></p>

# Tellr

Tellr is a real-time copilot that helps a bank teller make quick decisions when an older customer may be being scammed at the counter.

Built by Team KotR for HackPSU Fall 2026: Sebastian Villalba and Jonathan Zheng.

**Jump to:** [The problem](#the-problem) · [Why a teller](#why-a-teller) · [What we built](#what-we-built) · [How we built it with Cursor](#how-we-built-it-with-cursor) · [The demo vs real use](#the-demo-vs-real-use) · [The Llama 8B and benchmarks](#the-llama-8b-and-benchmarks) · [How a teller uses it](#how-a-teller-uses-it) · [Safety and limitations](#safety-and-limitations) · [Specs and tech stack](#specs-and-tech-stack) · [Quick start](#quick-start) · [Sources](#sources)

## The problem

In the FBI IC3 2025 Annual Report, people 60 and older reported $7.748 billion in losses, up 59% from 2024, average loss $38,500 [[1]](#source-1). The FTC puts the total cost of fraud to older adults in 2025 between $13.3 billion and $119.5 billion, depending on methodology [[2]](#source-2). That upper bound is as much as $119.5 billion (FTC upper estimate) [[2]](#source-2). Losses reported to the FTC are only the "tip of the iceberg" [[2]](#source-2). Scammers "coach people on what to say to bank employees" [[2]](#source-2).

FinCEN's 2024 analysis counted 155,415 suspicious-activity reports covering more than $27 billion, and it describes in-person victims who "may have been on the phone with someone directing their activities" [[3]](#source-3).

In the CFPB's 2019 elder exploitation report, fewer than a third of these suspicious-activity reports were also sent to the authorities [[4]](#source-4). In 2024, cash was the payment method in 16% of reports from adults 60+ who lost $10K or more to business or government imposter scams (crypto 33%, bank transfer 20%) [[5]](#source-5).

## Why a teller

Staff at the counter have stopped losses in published bank programs. A 2019 AARP and Virginia Tech BankSafe pilot covered more than 1,800 employees from nearly 500 branches in 11 states over six months [[6]](#source-6). Trained staff stopped $900,915 vs $54,384 (16 times) [[6]](#source-6). It was a pilot, not a controlled trial. BankSafe saved $137 million in 2024, a record up 53%, as reported by AARP itself [[7]](#source-7).

Tellr is built to put that kind of prompt beside every transaction.

## What we built

We built a teller-side screen for the counter. It shows a risk level, a suggested action, the signals the teller can confirm, and one next question. The teller always decides. Rules on the teller's taps set the level, and a local model only picks the next question.

### At a glance

| Question | Answer |
|---|---|
| Who is it for? | A bank teller at the counter, when an older customer may be being scammed during a transaction. |
| What problem? | Elder fraud at the window. In 2025, people 60 and older reported $7.748 billion in losses, up 59% from 2024, average loss $38,500 [[1]](#source-1). Scammers "coach people on what to say to bank employees" [[2]](#source-2). |
| What does it do? | It shows a risk level (Clear, Caution, or High), a suggested action, the signals the teller can confirm, and one next question. |
| Who decides? | The teller. Proceed, slow down, escalate, and report all stay available until the teller chooses. The screen suggests a level and a next action. |
| How does it pick the next question? | Llama 3.1 8B returns one question ID from the short list the rules allow. The score and the level stay with the rules. |
| How fast? | p50 463.6 ms is the typical reply and p95 482.7 ms is the slow end of our 50-run bench. Both are under the 1.5 second budget. |
| How accurate on our dev set? | 14/15 coached visits caught (they finished Caution or High) and 0/15 genuine visits falsely flagged (none marked High), on 30 dev scenarios with the live 8B. |
| What can you try now? | A scripted demo of 5 synthetic customers, with the real engine behind it when the API is up. |

## How we built it with Cursor

We two steered while agents wrote the code. Sebastian steered the engine and the evaluation. Jonathan steered the screen, the API, and the GPU laptop. One fresh agent took each card or fix, on its own branch and pull request. `scripts/gate.sh` had to pass before we merged. The engine and the screen share a frozen contract, and it changes only when both of us approve a written change. `ARCHITECTURE.md` is the one-page map of who owns which files. We ran up to 12 agents in parallel.

| Step | What happened |
|---|---|
| Fresh agent | One new agent for each card or fix. |
| Branch and PR | That work sat on its own branch and pull request. |
| Gate | `scripts/gate.sh` had to pass before we merged. |
| Frozen contract | The engine and the screen share one contract. It changes only when both of us approve a written change. |
| In parallel | Up to 12 agents in parallel. |

Three examples from this repo:

- We ran the held-out set once, on card A-08 (`docs/A08_HELDOUT_RUN.md`).
- We added History and the read-only health screen on card B-06.
- We used the same path for screen fixes. One of them dropped the Observed badge on the signal rows (`docs/handoff/20261025-0828-signal-rows-no-observed.md`).

## The demo vs real use

Our demo is scripted on purpose. Five synthetic customers play on a timer beside the screen. The last two post no chips. With no API, the page shows recorded engine answers and does not score them.

The real engine and the benchmarks are behind that demo. With the API up, the same events and the same library version produce the same level, reasons, pattern, and question. When the model is on, it returns one question ID. If that call is slower than 1.5 seconds, or the GPU is down, the rules answer that turn.

Live use is not loaded with a scenario. The teller taps what they see, and the engine scores that log. The header reads `Simulation: <customer title>` for a synthetic file and `LIVE — no scenario loaded` for a live session. A feed from a bank's core system is not built.

## The Llama 8B and benchmarks

The question picker is **Meta-Llama-3.1-8B-Instruct**, quantized **Q4_K_M**, on an RTX 5070 Laptop. It returns a question ID only. The score and the level are rules. Llama-3.2-3B-Instruct Q4_K_M is the fallback (p50 273.2 ms, p95 296.3 ms on the same bench).

| Metric | Figure | In one line |
|---|---|---|
| 8B total p50 | 463.6 ms | Typical reply on the 50-run latency bench. |
| 8B total p95 | 482.7 ms | Slow end of that bench. The budget is 1.5 s. |
| Catch | 14/15 | Coached dev visits that finished Caution or High. |
| False-flag | 0/15 | Genuine dev visits marked High. |
| Mean questions | 3.10 | Average questions before that dev interview stopped. |

Catch, false-flag, and mean questions are the live 8B on the 30-scenario dev set. The rules matched that run: catch 14/15, false-flag 0/15, mean 3.07 questions. On the held-out check (5 coached and 5 legitimate, run once) both finished at catch 4/5 and false-flag 0/5.

Latency bench:

```bash
python scripts/bench_llm.py --server http://127.0.0.1:8080 --runs 50 --label 8B
```

Development set:

```bash
scripts/with-gpu env LLAMA_SERVER=http://127.0.0.1:8080 \
  MODEL_ID=Meta-Llama-3.1-8B-Instruct-Q4_K_M \
  python -m eval.run --scenarios eval/scenarios/dev \
  --out eval/results/$(git rev-parse HEAD) \
  --arms A,B,C --model local
```

## How a teller uses it

Home puts the transaction on one side and the screen on the other. The screen shows one server snapshot. The engine computes the score, the level, and the next question.

- **Suggested action.** A short instruction from the server.
- **Urgency Score.** The server score over the contract maximum (`<score>/<max>`, clamped at +100). Clear is below 25, Caution starts at 25, and High starts at 60.
- **Score explanation.** What raised the score and what would lower it. The panel shows those server fields and leaves the score as the server sent it.
- **Signals.** Chips the teller can confirm, dismiss, or restore.
- **Case file.** No name, age, or gendered pronouns. The customer is labeled Customer.
- **Timeline.** Step, elapsed time, and speaker. The speaker is Customer.

Four outcomes stay available while the visit is open: proceed, slow down, escalate, and report.

## Safety and limitations

The teller makes the final call. The screen suggests a level and a next action. The teller approves or denies the withdrawal.

The Senior Safe Act (12 U.S.C. 3423) covers a person who has received the training and served as a supervisor or in a compliance or legal function (including a BSA officer) [[8]](#source-8). It gives no power to hold funds and does not cover a teller acting alone. A bank deploying this needs its compliance review.

Cuyahoga County's Scam Squad is related teller-based work. At a participating credit union, tellers use the handout for withdrawals of $5,000 or more [[9]](#source-9). The program is in beta. A research team will study results. There is no outcome data yet.

Our demo is scripted. A live visit loads no scenario, and a feed from a bank's core system is not built. On our dev set the model matched the rules. It has not beaten the rules.

Three patterns are marked `review: compliance` and ship with no signals. No legal sign-off is in the repo. The store can delete closed sessions, and the API does not call that.

Still open: Spanish wording, whether the customer's own words should reach the model, how to keep the pattern name off a customer's view, and more than one teller at a time.

## Specs and tech stack

| Piece | What the repo records |
|---|---|
| Training | Sebastian states: we trained the Llama 8B on an RTX 5070. |
| Inference | NVIDIA GeForce RTX 5070 Laptop, 8151 MiB. The 8B used 7379 MiB in the latency bench. |
| Model | Meta-Llama-3.1-8B-Instruct, Q4_K_M. It picks one question ID. It does not write the score. |
| Engine | Python >= 3.12, FastAPI, Pydantic >= 2. `reference_impl.py` is the scoring oracle. |
| Screen | React 19.3.1, Vite 8.3.5, TypeScript 6.0.3, Tailwind CSS 4.3.3. Four themes share one layout: `tellr`, `pnc`, `mtb`, `fnb`. |
| Store | SQLite. Events reject updates. |
| Contract | `CONTRACT_VERSION` 2.0.0. Every session response is a `SessionState`. |

The training recipe is not written in the repo.

## Quick start

```bash
make dev-api    # uvicorn on 127.0.0.1:8000
make dev-web    # Vite on 127.0.0.1:5173
python -m uvicorn api.main:app --port 8000
cd web && npm run dev:api   # pins VITE_API_URL to http://127.0.0.1:8000
```

## Sources

1. <a id="source-1"></a>FBI IC3 2025 Annual Report. FBI Internet Crime Complaint Center, 2025. <https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf>
2. <a id="source-2"></a>Protecting Older Consumers 2025-2026. Federal Trade Commission, 2026. <https://search.ftc.gov/system/files/ftc_gov/pdf/2026-older-adults-report-10192026.pdf>
3. <a id="source-3"></a>Elder Financial Exploitation analysis. Financial Crimes Enforcement Network (FinCEN), 2024. <https://www.fincen.gov/system/files/shared/FTA_Elder_Financial_Exploitation_508Final.pdf>
4. <a id="source-4"></a>Suspicious Activity Reports on Elder Financial Exploitation. Consumer Financial Protection Bureau, 2019. <https://files.consumerfinance.gov/f/documents/cfpb_suspicious-activity-reports-elder-financial-exploitation_report.pdf>
5. <a id="source-5"></a>False Alarm, Real Scam: How Scammers Are Stealing Older Adults' Life Savings (Data Spotlight). Federal Trade Commission, 2025. <https://www.ftc.gov/news-events/data-visualizations/data-spotlight/2025/08/false-alarm-real-scam-how-scammers-are-stealing-older-adults-life-savings>
6. <a id="source-6"></a>AARP and Virginia Tech BankSafe pilot. AARP, 2019. <https://www.aarp.org/press/releases/2019-10-17-financial-exploitation-declines-banksafe-aarp.html>
7. <a id="source-7"></a>AARP BankSafe. AARP, 2025. <https://www.aarp.org/press/releases/2025-02-25-banksafe-trained-seal.html>
8. <a id="source-8"></a>Senior Safe Act, 12 U.S.C. 3423. United States Code, via Cornell Law School Legal Information Institute. <https://www.law.cornell.edu/uscode/text/12/3423>
9. <a id="source-9"></a>Cuyahoga County Scam Squad set to launch teller-based fraud prevention program. Cleveland 19 News, 2026. <https://www.cleveland19.com/2026/07/01/cuyahoga-county-scam-squad-set-launch-teller-based-fraud-prevention-program/>
