<p align="center"><img src="docs/assets/tellr-logo.png" alt="Tellr" width="260"></p>

# Tellr

Tellr is a copilot for a teller at the counter: the local model sees visit ids and library labels, and never the customer's name, age, words, memo, or account details, so the prompt does not carry a person's identity.

Built by Team KotR for HackPSU Fall 2026: Sebastian Villalba and Jonathan Zheng.

**Jump to:** [What goes in](#what-goes-in-and-why-its-safe-for-a-bank) · [The problem](#the-problem) · [Why a teller](#why-a-teller) · [What we built](#what-we-built) · [Try it in two minutes](#try-it-in-two-minutes) · [How we built it with Cursor](#how-we-built-it-with-cursor) · [The demo vs real use](#the-demo-vs-real-use) · [The Llama 8B and benchmarks](#the-llama-8b-and-benchmarks) · [Templates](#templates) · [How a teller uses it](#how-a-teller-uses-it) · [Safety and limitations](#safety-and-limitations) · [Specs and tech stack](#specs-and-tech-stack) · [Sources](#sources)

## What goes in, and why it's safe for a bank

**Model sees** (`engine/prompt.py`): context-chip ids, the purpose id, each answer as a question id plus a chip id, evidence ids, the pattern id, the candidate question ids with their library lines, and the library's chip and purpose labels. **Model never sees** the name, age band, tenure, typical withdrawal, channels, account activity, memo, transaction type, dollar amount, amount band, or the customer's own words.

**Rules** (`engine/reduce.py`) score the chip ids and the answer chips. The purpose id chooses questions and is not passed into the score. The fields the model never sees stay out of the rules too. **Stored** (`store/sqlite.py`, `api/main.py`): mode, time, library version, the amount band, the chip ids, and each answer's question id and chip. A note is stored only if a client sends one; this demo does not. `account_ref` is written null. The Outcome screen stores the typed teller name and does not send it to the model (`web/src/screens/OutcomeScreen.tsx`). The case file shows tenure, typical withdrawal, and channels. With it open, Home renders no name, age band, or gendered pronoun (`web/src/workstation/TransactionPanel.tsx`, `web/src/privacy.test.tsx`). Account activity stays in the demo file and is neither shown nor sent. The memo and the on-screen dollar amount are not posted.

The model returns one question id. It does not set the score, the level, or the action (`recommenders/validate.py`, `engine/rules.py`). The API defaults to the rules. The 8B posts to `llama-server` at `127.0.0.1:8080`, and a hosted call runs only if `HOSTED_LLM_URL` is set (`api/main.py`). If that call is slow or the server is down, the rules pick the question (`recommenders/select.py`). The teller decides.

## The problem

In the FBI IC3 2025 Annual Report, people 60 and older reported $7.748 billion in losses, up 59% from 2024, average loss $38,500 [[1]](#source-1). The FTC puts the total cost of fraud to older adults in 2025 between $13.3 billion and $119.5 billion, depending on methodology [[2]](#source-2). Losses reported to the FTC are only the "tip of the iceberg" [[2]](#source-2). Scammers "coach people on what to say to bank employees" [[2]](#source-2).

FinCEN's 2024 analysis counted 155,415 suspicious-activity reports covering more than $27 billion, and it describes in-person victims who "may have been on the phone with someone directing their activities" [[3]](#source-3).

In the CFPB's 2019 elder exploitation report, fewer than a third of the suspicious-activity reports were also sent to the authorities [[4]](#source-4). In 2024, cash was the payment method in 16% of reports from adults 60+ who lost $10K or more to business or government imposter scams (crypto 33%, bank transfer 20%) [[5]](#source-5).

## Why a teller

Staff at the counter have stopped losses in published bank programs. A 2019 AARP and Virginia Tech BankSafe pilot covered more than 1,800 employees from nearly 500 branches in 11 states over six months [[6]](#source-6). Trained staff stopped $900,915, compared with $54,384 (16 times) [[6]](#source-6). It was a pilot, not a controlled trial. BankSafe saved $137 million in 2024, a record up 53%, as reported by AARP itself [[7]](#source-7).

## What we built

We built a teller-side screen for the counter.

### At a glance

| Question | Answer |
|---|---|
| Who is it for? | A bank teller at the counter during a withdrawal. |
| What problem? | Elder fraud at the window, while the customer is standing there. |
| What does it do? | A level, a suggested action, signal chips, and one next question. |
| What does the model see? | See [What goes in](#what-goes-in-and-why-its-safe-for-a-bank). |
| How fast? | The latency bench below. |
| How accurate on our dev set? | Catch and false-flag on the dev set, in the table below. |
| What can you try now? | The counter screen. The steps are next. |

## Try it in two minutes

```bash
make dev-api
make dev-web
```

Open http://127.0.0.1:5173 (API on port 8000). Under Simulated customer, choose Government impersonation and press Play. Let the file finish (about 45 seconds at 1×). The level climbs to High (`web/src/demo/customers.ts`).

Demo video: link to be added

## How we built it with Cursor

Sebastian ran the engine and the evaluation. Jonathan ran the screen, the API, and the GPU laptop. Agents wrote the code. We ran up to 12 agents in parallel, adding an agent when the work split into its own card or fix and scaling back when it did not. Each agent took one card or one fix, on its own branch and pull request. `scripts/gate.sh` had to pass before we merged. The engine and the screen share a frozen contract, and it changes only when both of us approve a written change (`WORKFLOW.md` §3, §5; `ARCHITECTURE.md`). That path covered roster cards, including the A-08 held-out run (`docs/A08_HELDOUT_RUN.md`) and the B screen cards, and UI fixes such as dropping the Observed badge (`docs/handoff/20261025-0828-signal-rows-no-observed.md`).

## The demo vs real use

The demo is scripted. Five synthetic customers play on a timer. The two benign files post no chips and no answers. With no API, the page shows recorded answers and does not score them. With the API up, the same taps and the same library version produce the same level, reasons, pattern, and question (`docs/architecture.md` §4). A live visit loads no scenario. The teller taps what they see, and the engine scores that log. The header reads `Simulation: <customer title>` for a synthetic file and `LIVE — no scenario loaded` for a live session. A feed from a bank's core system is not built (`docs/architecture.md` §14.1).

## The Llama 8B and benchmarks

The question picker is **Meta-Llama-3.1-8B-Instruct**, quantized **Q4_K_M**, on an RTX 5070 Laptop (8151 MiB; the 8B used 7379 MiB on this bench). Llama-3.2-3B-Instruct Q4_K_M is the fallback (p50 273.2 ms, p95 296.3 ms).

| Metric | Figure |
|---|---|
| 8B total p50 | 463.6 ms |
| 8B total p95 | 482.7 ms |
| Catch | 14/15 |
| False-flag | 0/15 |
| Mean questions | 3.10 |

Catch, false-flag, and mean questions are the live 8B on 30 dev scenarios (15 coached, 15 legitimate). p50 and p95 are a 50-run bench of one reply.

- **p50.** The midpoint of those 50 replies: the typical wait. The spec sets no p50 cutoff. A lower number is a faster typical reply for the teller.
- **p95.** The slow end of that bench. The budget we build against is 1.5 s p95, from a chip tap to the next question (`docs/architecture.md` §1). About 0.7 s is our own sum of stage targets, not that cutoff (`docs/architecture.md` §8.3). For the teller, this is the pause in front of the customer.
- **Catch.** Coached visits that finish Caution or High. The spec sets no minimum. Good, for us, is a coached visit not left at Clear. On its own, catch is weak: marking every customer Caution would catch them all (`docs/architecture.md` §13.3).
- **False-flag.** Genuine visits marked High. The spec sets no maximum. Good, for us, is none. That is the number that stops "flag everyone" from looking perfect.
- **Mean questions.** The average number of questions before the interview stopped. The spec turns that into time at about 13 seconds each, and the low-risk path is under 60 seconds (`docs/architecture.md` §1). For the teller, this is how long the customer stands at the window.

The rules on that dev set matched this catch and false-flag, at mean 3.07 questions, so the 8B did not beat them. Held-out, five and five, run once: the rules and the 8B were each catch 4/5 and false-flag 0/5 (`docs/A08_HELDOUT_RUN.md`). On 15 scenarios the spec says not to call a gap significant (`docs/architecture.md` §13.3).

Dev-set command: `docs/CP3_GPU_RUN.md`. Held-out command: `docs/A08_HELDOUT_RUN.md`. Latency bench: `python scripts/bench_llm.py --server http://127.0.0.1:8080 --runs 50 --label 8B`.

## Templates

Talk tracks in `library/talk_tracks.yaml` are the teller-facing wording. `stage` is the level's track: `tt.proceed`, `tt.slow_down`, or `tt.escalate`. `lines` are lines to say. `avoid` is lines to avoid. `action` is the short instruction. `pattern` is a second track id, or empty. `library/patterns.yaml` points at one (`talk_track: tt.bank_impersonation`). Those lines are added only while that pattern is displayed, and they do not replace `action` or `avoid` (`engine/rules.py`). This is the High track, verbatim:

```yaml
  - id: tt.escalate
    action: Ask the customer to step aside and get a manager.
    lines:
      - I'd like my manager to take a quick look. It's routine for larger cash withdrawals.
    avoid:
      - Anything accusatory
      - Anything the caller warned them the bank would say
```

## How a teller uses it

Home puts the transaction beside the copilot. The copilot shows one server snapshot and does not compute the score, the level, or the next question (`docs/architecture.md` §12). Clear is below 25, Caution starts at 25, and High starts at 60, as an icon plus the word (`docs/architecture.md` §6.3). Urgency Score is `<score>/<max>`, clamped at +100. Suggested action is the talk track's `action`. The explanation shows what raised the score and what would lower it. Signal chips can be confirmed, dismissed, or restored. Proceed, slow down, escalate, and report stay available for the whole visit (`docs/architecture.md` §9).

## Safety and limitations

The Senior Safe Act (12 U.S.C. 3423) covers a person who has received the training and served as a supervisor or in a compliance or legal function (including a BSA officer) [[8]](#source-8). It gives no power to hold funds and does not cover a teller acting alone. A bank deploying this needs its compliance review.

Cuyahoga County's Scam Squad is related teller-based work. At a participating credit union, tellers use the handout for withdrawals of $5,000 or more [[9]](#source-9). The program is in beta. A research team will study results. There is no outcome data yet.

Three patterns are marked `review: compliance` and ship with no signals (`library/patterns.yaml`).

Open items: training recipe for the 8B is not in the repo; no real bank pilot; no compliance sign-off; no encryption at rest, security review, audit-retention policy, or data-retention policy (`store/sqlite.py` can delete closed sessions, and the API does not call it). The Outcome screen stores a typed teller name. Still open in the spec: Spanish wording, whether the customer's words should reach the model, the pattern name on the customer's side of the screen, and more than one teller (`docs/architecture.md` §19).

## Specs and tech stack

Sebastian states an RTX 5070 was used to train the Llama 8B. The engine is Python >= 3.12, FastAPI, and Pydantic >= 2, and `reference_impl.py` is the scoring oracle. The screen is React 19.3.1, Vite 8.3.5, TypeScript 6.0.3, and Tailwind CSS 4.3.3. Theme ids `tellr`, `pnc`, `mtb`, `fnb` share one layout. The store is SQLite, and events reject updates. `CONTRACT_VERSION` is 2.0.0. Every session response is a `SessionState`.

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
