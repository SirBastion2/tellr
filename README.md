<p align="center"><img src="docs/assets/tellr-logo.png" alt="tellr" width="260"></p>

# tellr

tellr is an interview aid for a teller at a fast counter: a low-risk visit is meant to finish in under 60 seconds, a multi-second blank screen is dead air, and the teller always decides.

## At a glance

| Topic | In one line |
|---|---|
| What it is | Interview aid; the teller always decides. |
| Demo | 5 scripted synthetic customers, real engine behind it. |
| Real use | Live session, scored by the engine. |
| Model | Llama 3.1 8B picks the next question. |
| Speed | p50 463.6 ms, p95 482.7 ms, under the 1.5 s budget. |
| Accuracy | 14/15 coached caught, 0/15 false flags on the 30-scenario dev set. |

**Jump to:** [How we built it with Cursor](#how-we-built-it-with-cursor) · [Demo vs real use](#demo-vs-real-use) · [The Llama 8B](#the-llama-8b) · [How a teller uses it](#how-a-teller-uses-it) · [Safety and limitations](#safety-and-limitations) · [Specs](#specs-and-tech-stack) · [Quick start](#quick-start)

## How we built it with Cursor

Two people steered. Sebastian watched the engine and the evaluation. Jonathan watched the screen, the API, and the GPU laptop. Agents wrote the code. `ARCHITECTURE.md` is the one-page map of who owns which files.

| Step | What happened |
|---|---|
| Fresh agent | One new agent for each card or fix. |
| Branch and PR | That work sat on its own branch and pull request. |
| Gate | `scripts/gate.sh` had to pass before a driver merged. |
| Frozen contract | The engine and the screen share one contract. It changes only when both drivers approve a written change. |
| In parallel | Up to 12 agents in parallel. |

Real examples from this repo:

- Card A-08 ran the held-out set once (`docs/A08_HELDOUT_RUN.md`).
- Card B-06 added History and the read-only health screen.
- UI fixes used the same path. One of them dropped the Observed badge on copilot signal rows (`docs/handoff/20261025-0828-signal-rows-no-observed.md`).

## Demo vs real use

The demo plays five synthetic customers on a timer beside the copilot. The last two post no chips. With no API, the page shows recorded engine answers and does not score them.

A live session cannot load a scenario. The teller taps what they see, and the engine scores that log. The header reads `Simulation: <customer title>` for a synthetic file and `LIVE — no scenario loaded` for a live session. A feed from a bank's core system is not built.

With the API up, the same events and the same library version produce the same level, reasons, pattern, and question. The model, when it is on, returns one question ID. If that call is slower than 1.5 seconds, or the GPU is down, the rules answer that turn.

## The Llama 8B

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

Home puts the transaction on one side and a copilot card on the other. The card shows one server snapshot. The screen does not compute the score, the level, or the next question.

- **Suggested action.** A short imperative from the server, not a question.
- **Urgency Score.** The server score over the contract maximum (`<score>/<max>`, clamped at +100). Clear is below 25, Caution starts at 25, and High starts at 60.
- **Score explanation.** What raised the score and what would lower it. The panel shows those server fields and does not rescore them.
- **Signals.** Chips the teller can confirm, dismiss, or restore.
- **Case file.** No name, age, or gendered pronouns. The customer is labeled Customer.
- **Timeline.** Step, elapsed time, and speaker. Speaker is Customer.

Four outcomes stay available while the visit is open: proceed, slow down, escalate, and report.

## Safety and limitations

The teller makes the final call. The copilot suggests a level and a next action. It does not approve or deny the withdrawal.

The judging demo is scripted. A live visit loads no scenario, and there is no link to a bank's core system. The model has not beaten the rules.

A bank would still need a compliance review. Three patterns are marked `review: compliance` and ship with no signals. No legal sign-off is in the repo. The store can delete closed sessions, and the API does not call that.

Still open: Spanish wording, whether the customer's own words should reach the model, how to keep the pattern name off a customer's view, and more than one teller at a time.

## Specs and tech stack

| Piece | What the repo records |
|---|---|
| Training | Sebastian states an RTX 5070 was used to train the Llama 8B. That training run is not written down in the repo. |
| Inference | NVIDIA GeForce RTX 5070 Laptop, 8151 MiB. The 8B used 7379 MiB in the latency bench. |
| Model | Meta-Llama-3.1-8B-Instruct, Q4_K_M. It picks one question ID. It does not write the score. |
| Engine | Python >= 3.12, FastAPI, Pydantic >= 2. `reference_impl.py` is the scoring oracle. |
| Screen | React 19.3.1, Vite 8.3.5, TypeScript 6.0.3, Tailwind CSS 4.3.3. Four themes share one layout: `tellr`, `pnc`, `mtb`, `fnb`. |
| Store | SQLite. Events reject updates. |
| Contract | `CONTRACT_VERSION` 2.0.0. Every session response is a `SessionState`. |

## Quick start

```bash
make dev-api    # uvicorn on 127.0.0.1:8000
make dev-web    # Vite on 127.0.0.1:5173
python -m uvicorn api.main:app --port 8000
cd web && npm run dev:api   # pins VITE_API_URL to http://127.0.0.1:8000
```
