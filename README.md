<p align="center"><img src="docs/assets/tellr-logo.png" alt="Tellr" width="260"></p>

# Tellr

Tellr is a copilot beside the teller at the counter. It helps them spot a customer who may have been coached through elder fraud during a cash withdrawal.

The model gets only anonymous codes (ids) and short labels from the question list. It never gets a name, an age, account details, a memo, a dollar amount, or the customer's own words.

That is safe for a bank. Identity never reaches the model. By default the model runs on the same computer as Tellr, not in a cloud service. It only picks the next question, and it cannot set the score, the level, or the action. The teller decides.

Built by Team KotR for HackPSU Fall 2026: Sebastian Villalba and Jonathan Zheng.

## In 30 seconds

- We built it for a teller at the counter, on a cash withdrawal, when the customer may have been coached through elder fraud.
- Tellr speeds up deciding what to do at the counter. In unusual cases the teller uses their own judgment, which also helps prevent information leaks.
- The teller only taps. They tap signal chips and answer the copilot's next question with a tap. One signal those taps can record is "Told not to discuss with the bank." The engine builds the model's prompt itself from those taps, using a fixed allowlist of ids and library labels (anonymous codes and short names; a fixed list of approved items). A typed note is allowed but dropped before the prompt, so nothing the teller types reaches the model. The only typing on screen is Teller name on Outcome, and it is never sent to the model. [What goes in](#what-goes-in-and-why-its-safe-for-a-bank).
- Tellr never listens. There is no microphone, no audio software, no call recording, and no transcript of what the customer said. Voice input is not built (`docs/architecture.md`).
- We added playback so a judge can watch a scripted visit in about 45 seconds at normal speed ("Government impersonation"). A real teller would not see that playback. The controls are in [The demo vs real use](#the-demo-vs-real-use).
- `tellr` is the default look. PNC, M&T (`mtb`), and F.N.B. (`fnb`) are example looks of the same screen. They change the color, the font, and the logo. They are not affiliations or endorsements. The signals, questions, words to say, scam patterns, and score weights are files in `library/` that you can edit. A feed from a bank's core system is not built.

**Jump to:** [In 30 seconds](#in-30-seconds) · [The problem](#the-problem) · [Why a Teller Copilot](#why-a-teller-copilot) · [What goes in](#what-goes-in-and-why-its-safe-for-a-bank) · [Try it in two minutes](#try-it-in-two-minutes) · [How we built it with Cursor](#how-we-built-it-with-cursor) · [The demo vs real use](#the-demo-vs-real-use) · [The Llama 8B and benchmarks](#the-llama-8b-and-benchmarks) · [Templates](#templates) · [How a teller uses it](#how-a-teller-uses-it) · [Safety and limitations](#safety-and-limitations) · [Specs and tech stack](#specs-and-tech-stack) · [Sources](#sources)

## The problem

In the FBI IC3 2025 Annual Report, people 60 and older reported $7.748 billion in losses, up 59% from 2024, average loss $38,500 [[1]](#source-1). The FTC puts the total cost of fraud to older adults in 2025 between $13.3 billion and $119.5 billion, depending on methodology [[2]](#source-2). Losses reported to the FTC are only the "tip of the iceberg" [[2]](#source-2). Scammers "coach people on what to say to bank employees" [[2]](#source-2).

FinCEN's 2024 analysis counted 155,415 suspicious-activity reports covering more than $27 billion, and it describes in-person victims who "may have been on the phone with someone directing their activities" [[3]](#source-3).

In the CFPB's 2019 elder exploitation report, fewer than a third of the suspicious-activity reports were also sent to the authorities [[4]](#source-4). In 2024, cash was the payment method in 16% of reports from adults 60+ who lost $10K or more to business or government imposter scams (crypto 33%, bank transfer 20%) [[5]](#source-5).

## Why a Teller Copilot

Staff at the counter have stopped losses in published bank programs. A 2019 AARP and Virginia Tech BankSafe pilot covered more than 1,800 employees from nearly 500 branches in 11 states over six months [[6]](#source-6). Trained staff stopped $900,915, compared with $54,384 (16 times) [[6]](#source-6). It was a pilot, not a controlled trial. BankSafe saved $137 million in 2024, a record up 53%, as reported by AARP itself [[7]](#source-7).

## What goes in, and why it's safe for a bank

A chip the teller can tap is "Mentions urgency, secrecy, or being told what to say." How the demo posts taps is in [The demo vs real use](#the-demo-vs-real-use).

| Model sees | Model never sees |
|---|---|
| Anonymous codes for the signals the teller noted, the purpose the customer stated, the answers, the reasons already on the score, the matched pattern, and the next questions. Also the short names for those signals, purposes, and questions. | Name, age, account details, how long they have banked, their usual withdrawal, Channels (how they usually bank), account activity, the memo, the dollar amount and its size bracket, and the customer's own words. |

- The model only picks the next question. It cannot set the score, the level, or the action. The rules set the score. The purpose the customer stated only picks questions, and it is not part of the score. The teller decides. That table is everything the model may be shown.
- If the model is slow, down, or names a question it was not allowed to pick, the rules pick the question.
- It runs on this computer by default. A hosted model is optional, and off unless it is turned on. The product starts on the rules, with no model required.
- The log keeps the visit type, the time, which version of the library files was used, the withdrawal size bracket, and anonymous codes for the signals and answers. It does not keep an account number or the customer's words. A teller's typed name is stored with the decision. On screen, the case file can show how long they have banked, a typical withdrawal, and Channels. It does not show a name, an age, or gendered pronouns. Account activity is not shown and not sent. The memo, the type, and the dollar amount stay on screen and are not sent. See `docs/architecture.md`.

## Try it in two minutes

```bash
make dev-api
make dev-web
```

Open http://127.0.0.1:5173 (API on port 8000). Under Simulated customer, choose Government impersonation and press Play. Let the file finish. The level climbs to High (`web/src/demo/customers.ts`).

Demo video: link to be added

## How we built it with Cursor

We built Tellr together. We built the scoring engine, the measured checks, the screen, and the web service, and we ran the benchmarks on an RTX 5070 Laptop. Agents wrote the code.

We split the work into written tasks, then into small fixes. Each one sat on its own working copy (a branch) and its own pull request (a GitHub review), with a short note for the next person (`docs/handoff/`). We decided how many agents to run from the work in front of us. We added an agent when a task touched its own folders. We held back when tasks shared files, or shared the written rules the engine and the screen both follow (`docs/ROSTER.md`; `WORKFLOW.md`). The written plan uses four building agents, and a fifth only after the shared screen files stop changing (`docs/ROSTER.md`). Our cap was 12 agents at once. We did not stay at that cap. Open pull requests peaked at 9. If an agent got stuck, we started a fresh chat with the task and the newest note (`WORKFLOW.md`). The writer for the separate visit set was a new agent, used once (`docs/ROSTER.md`).

An automated check, `scripts/gate.sh`, had to pass before we merged. We merged one pull request at a time. More than 150 have merged. The engine side and the screen side wrote to each other in `docs/A_TO_B.md` and `docs/B_TO_A.md`. A problem in the other side's files was written in `docs/CROSS_LANE.md` and left for that side to fix. Those shared rules change only when we both approve a written change (`WORKFLOW.md`).

The same path covered those tasks, including the one-time run on a separate set of visits (`docs/A08_HELDOUT_RUN.md`), the screen tasks, and fixes such as the badge on the Handoff screen (`docs/handoff/20261025-0935-handoff-observed-badge.md`).

## The demo vs real use

The page you open always loads a simulated customer, so you see a Simulated customer picker, Play, Step, Restart, a 1× / 2× / 4× speed control, an elapsed timer, the script timeline, a header reading `Simulation: <customer title>`, and a Practice data note. The screen walk-through is in [How a teller uses it](#how-a-teller-uses-it).

A scripted file plays on a timer and posts the signals a teller would tap, so the teller does not tap them. "Government impersonation", "Romance, crypto cash", and "Contractor cash, coached" also post the answer taps. "Car down payment" and "Routine Friday cash" post no signals and no answers. The demo never sends a typed note. With the server running, those posts are scored as a teller's own taps would be: the same events and the same version of the library files produce the same level, reasons, pattern, and question (`docs/architecture.md`). With no server, the page shows a saved reply and does not score it. The copilot, the score, the suggested action, and Handoff read that same session.

A live visit loads no scenario (`docs/architecture.md`). With no simulated customer, the header reads `LIVE — no scenario loaded`.

## The Llama 8B and benchmarks

The question picker is **Meta-Llama-3.1-8B-Instruct**, an 8-billion-parameter model, quantized (stored in a smaller form) as **Q4_K_M**, on an RTX 5070 Laptop (8151 MiB of graphics memory; the 8B used 7379 MiB on this bench). Llama-3.2-3B-Instruct Q4_K_M is the smaller backup (p50 273.2 ms, p95 296.3 ms). p50 is the typical wait and p95 is the slow end. Both are defined under the table.

| Metric | Figure |
|---|---|
| 8B total p50 | 463.6 ms |
| 8B total p95 | 482.7 ms |
| Catch | 14/15 |
| False-flag | 0/15 |
| Mean questions | 3.10 |

Catch, false-flag, and mean questions are the live 8B on 30 visits we used while building (15 coached, 15 legitimate). p50 and p95 are a 50-run test of one reply.

- **p50.** The midpoint of those 50 replies: the typical wait. The design sets no cutoff for it. A lower number is a faster typical reply for the teller.
- **p95.** The slow end of that test. The limit we build against is 1.5 seconds here, from a teller's tap to the next question (`docs/architecture.md`). About 0.7 seconds is our own faster goal, not that limit. For the teller, this is the pause in front of the customer.
- **Catch.** Coached visits that finish Caution or High. The design sets no minimum. Good, for us, is a coached visit not left at Clear. On its own, catch is weak: marking every customer Caution would catch them all (`docs/architecture.md`).
- **False-flag.** Genuine visits marked High. The design sets no maximum. Good, for us, is none. That is the number that stops "flag everyone" from looking perfect.
- **Mean questions.** The average number of questions before the interview stopped. The design turns that into time at about 13 seconds each, and the low-risk path is under 60 seconds (`docs/architecture.md`). For the teller, this is how long the customer stands at the window.

The rules on those 30 visits matched this catch and false-flag, at a mean of 3.07 questions, so the 8B did not beat them. On a separate set of 10 visits, five coached and five legitimate, run once: the rules and the 8B were each catch 4/5 and false-flag 0/5 (`docs/A08_HELDOUT_RUN.md`). On 15 visits the design says not to call a gap significant (`docs/architecture.md`).

Development-set command: `docs/CP3_GPU_RUN.md`. Separate-set command: `docs/A08_HELDOUT_RUN.md`. Speed test: `python scripts/bench_llm.py --server http://127.0.0.1:8080 --runs 50 --label 8B`.

## Templates

The words the teller can say live in `library/talk_tracks.yaml`. Each level has a short instruction (`action`), lines to say (`lines`), and lines to avoid (`avoid`). A pattern can add a second set of lines (`library/patterns.yaml`). Those extra lines show only while that pattern is on screen, and they do not replace the instruction or the avoid list (`engine/rules.py`). This is the High-level track, word for word:

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

Home is what a judge sees. Playback is for the demo only. A real teller would not see it. [In 30 seconds](#in-30-seconds) · [The demo vs real use](#the-demo-vs-real-use).

- Header, left to right: the title Teller Copilot, then `Simulation: <customer title>`, the tabs Home, Outcome, and Handoff, then Light / Dark / System, then ? (Keyboard shortcuts).
- Left, demo only: Simulated customer, Play (the word changes to Pause while it runs), Step and Restart (icon buttons), speed 1× / 2× / 4×, and an elapsed timer. A real teller would not see this toolbar.
- Still on the left: Transaction, with Type, Amount, and Memo, then Timeline, the steps at the window. The scripted timeline is playback, so a real teller would not see it.
- Right, the heading is Copilot. Before Play it says "Press play to start the simulation."
- After Play, a badge reads Clear, Caution, or High (an icon plus the word). Clear is below 25, Caution starts at 25, and High starts at 60.
- Urgency Score is the score over 100, beside Score explanation (what raised it, and what would lower it). The screen does not compute the score, the level, or the next question.
- Suggested action is one line.
- Each signal row has a check (Confirm) and an X (Dismiss). A row the teller confirmed, or entered, reads Teller confirmed. A row the demo posted and has not confirmed has no badge. A row from an answer reads From the customer's answer. A dismissed row shows Restore instead.
- Undo undoes the last signal change. Escalate to supervisor asks a supervisor to take the visit.
- Outcome records Proceed, Slow down, Escalate, or Report, and a Teller name. All four stay available until the visit closes, whether or not the choice matches the suggestion. Handoff is the summary of that decision. Why the teller, not the copilot, makes the call is in [In 30 seconds](#in-30-seconds).

## Safety and limitations

The Senior Safe Act (12 U.S.C. 3423) covers a person who was trained and has served as a supervisor, or in compliance or legal (including a Bank Secrecy Act officer) [[8]](#source-8). It gives no power to hold funds, and it does not cover a teller acting alone. A bank deploying this needs its compliance review.

Cuyahoga County's Scam Squad is related teller-based work. At a participating credit union, tellers use the handout for withdrawals of $5,000 or more [[9]](#source-9). The program is in beta. A research team will study results. There is no outcome data yet.

Three patterns are marked for a compliance review and include no signals the score can use (`library/patterns.yaml`).

Open items: the training steps for the 8B are not in the repo; no real bank pilot; no compliance sign-off; saved visits are not encrypted; no security review; no rule for audits or for how long records are kept (`store/sqlite.py` can delete closed visits, and the server does not call it). The Outcome screen stores a typed teller name. Still open in the design: Spanish wording, whether the customer's words should reach the model, the scam-pattern name on the customer's side of the screen, and more than one teller (`docs/architecture.md`).

## Specs and tech stack

We trained the Llama 8B (the 8-billion-parameter model) on an RTX 5070 laptop GPU (the training steps are not in the repo; see Open items). The scoring engine is Python 3.12 or newer. The web service is FastAPI, a Python toolkit for the web, and the data checks are Pydantic 2 or newer, a checker for the shape of the data. `reference_impl.py` is the scoring reference the tests compare against. The screen is React 19.3.1, Vite 8.3.5, TypeScript 6.0.3, and Tailwind CSS 4.3.3. Visits are stored in SQLite, a small database file, and a stored event cannot be edited. The shared rules between the engine and the screen are version 2.0.0. Every visit reply is one complete picture of the visit.

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
