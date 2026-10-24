"""A-03 latency benchmark (architecture §8.1-§8.3).

Standalone: talks to a running llama-server over HTTP, stdlib only.

    python scripts/bench_llm.py --server http://127.0.0.1:8080 --runs 50 --label 3B

Prompt: a stable ~1,000-token prefix (system contract, answer-chip and purpose
vocabularies, worked examples) followed by a ~250-token per-turn suffix built from
contract/library.json and T2's transcript (contract/fixtures/T2.json). Output is
constrained by a 12-way GBNF grammar over question IDs (§8.2), temperature 0.

The library has fewer than 12 question IDs, so the candidate set is padded with
synthetic `q.bench.*` IDs to reach the 12-way grammar the card asks for.
"""
from __future__ import annotations

import argparse
import json
import statistics
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
N_CANDIDATES = 12
PREFIX_TARGET = 1000
SUFFIX_TARGET = 250


def post(server: str, path: str, body: dict) -> dict:
    req = urllib.request.Request(
        server + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def ntok(server: str, text: str) -> int:
    return len(post(server, "/tokenize", {"content": text})["tokens"])


def load():
    lib = json.loads((ROOT / "contract" / "library.json").read_text(encoding="utf-8"))
    t2 = json.loads((ROOT / "contract" / "fixtures" / "T2.json").read_text(encoding="utf-8"))
    return lib, t2


def candidates(lib: dict) -> list[tuple[str, str]]:
    c = [(q["id"], q["why"]) for q in lib["questions"] if q.get("role") != "opener"]
    i = 1
    while len(c) < N_CANDIDATES:
        c.append((f"q.bench.extra_{i:02d}", "Synthetic padding candidate for the 12-way benchmark."))
        i += 1
    return c[:N_CANDIDATES]


def grammar(ids: list[str]) -> str:
    alts = " | ".join('"\\"%s\\""' % i for i in ids)
    return (
        'root ::= "{" ws "\\"next_question_id\\":" ws qid ws "}"\n'
        f"qid  ::= {alts}\n"
        "ws   ::= [ \\t\\n]*\n"
    )


def build_prefix(server: str, lib: dict) -> str:
    head = [
        "SYSTEM CONTRACT",
        "You assist a bank teller during a cash withdrawal interview. You select exactly one",
        "question ID from the candidate list given in each turn. You do not write questions,",
        "you do not write free text, you do not assess risk, and you never invent an ID.",
        'Reply with JSON only: {"next_question_id": "<one candidate id>"}.',
        "Prefer the candidate whose answer would most change the leading pattern.",
        "",
        "ANSWER-CHIP VOCABULARY",
    ]
    head += [f"- {c['id']}: {c['label']} (used on: {c['used_on']})" for c in lib["chips"]]
    head += ["", "STATED-PURPOSE VOCABULARY"]
    head += [f"- {p['id']}: {p['label']}" for p in lib["purposes"]]
    head += ["", "CONTEXT-CHIP VOCABULARY"]
    head += [f"- {c['id']}: {c['label']}" for c in lib["context_chips"]]
    head += ["", "PATTERN VOCABULARY"]
    head += [f"- {p['id']}: {p['label']}" for p in lib["patterns"] + lib["look_alikes"]]
    head += ["", "WORKED EXAMPLES"]
    text = "\n".join(head)
    qs = [q for q in lib["questions"] if q.get("role") != "opener"]
    k = 0
    while ntok(server, text) < PREFIX_TARGET - 60:
        q = qs[k % len(qs)]
        p = lib["purposes"][k % len(lib["purposes"])]
        text += (
            f"\nExample {k + 1}: purpose {p['id']}; candidates include {q['id']} ({q['why']}). "
            f'Answer: {{"next_question_id": "{q["id"]}"}}'
        )
        k += 1
    return text + "\n\n"


def build_suffix(lib: dict, t2: dict, cands, nonce: int) -> str:
    steps = t2["steps"]
    ctx = next(s["request"]["chips"] for s in steps if s["endpoint"].endswith("/context"))
    ans = [s["request"] for s in steps if s["endpoint"].endswith("/answers")]
    last = steps[-1]["response"]
    lines = [f"TURN {nonce}", "Context chips: " + ", ".join(ctx)]
    lines.append("Stated purpose: " + str(last.get("stated_purpose")))
    lines.append("Transcript:")
    lines += [f"- ({a['question_id']}, {a['chip']})" for a in ans]
    lines.append("Evidence: " + ", ".join(r["id"] for r in last["risk"]["reasons"]))
    lines.append("Leading pattern: " + str((last["risk"].get("pattern") or {}).get("id")))
    lines.append("Candidates:")
    lines += [f"- {i}: {w}" for i, w in cands]
    lines.append("Answer:")
    return "\n".join(lines)


def pct(xs, p):
    xs = sorted(xs)
    k = (len(xs) - 1) * p / 100
    f = int(k)
    c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)


def gpu() -> str:
    try:
        return subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,driver_version", "--format=csv,noheader"],
            capture_output=True, text=True, timeout=20,
        ).stdout.strip()
    except Exception as e:  # noqa: BLE001
        return f"unknown ({e})"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--server", default="http://127.0.0.1:8080")
    ap.add_argument("--runs", type=int, default=50)
    ap.add_argument("--warmup", type=int, default=3)
    ap.add_argument("--label", default="model")
    a = ap.parse_args()

    lib, t2 = load()
    cands = candidates(lib)
    g = grammar([i for i, _ in cands])
    prefix = build_prefix(a.server, lib)

    def run(n: int):
        body = {
            "prompt": prefix + build_suffix(lib, t2, cands, n),
            "grammar": g, "temperature": 0, "n_predict": 32,
            "cache_prompt": True, "stream": False,
        }
        t0 = time.perf_counter()
        r = post(a.server, "/completion", body)
        return (time.perf_counter() - t0) * 1000, r

    for i in range(a.warmup):
        run(-1 - i)
    tot, pre, dec, newtok, outtok, outs = [], [], [], [], [], set()
    for i in range(a.runs):
        ms, r = run(i)
        t = r["timings"]
        tot.append(ms); pre.append(t["prompt_ms"]); dec.append(t["predicted_ms"])
        newtok.append(t["prompt_n"]); outtok.append(t["predicted_n"])
        outs.add(json.loads(r["content"])["next_question_id"])

    res = {
        "label": a.label,
        "gpu": gpu(),
        "prefix_tokens": ntok(a.server, prefix),
        "suffix_tokens": ntok(a.server, build_suffix(lib, t2, cands, 0)),
        "runs": a.runs,
        "prefill_new_tokens_median": statistics.median(newtok),
        "decode_tokens_median": statistics.median(outtok),
        "outputs": sorted(outs),
    }
    for name, xs in (("total", tot), ("prefill", pre), ("decode", dec)):
        res[f"{name}_p50_ms"] = round(pct(xs, 50), 1)
        res[f"{name}_p95_ms"] = round(pct(xs, 95), 1)
    res["pass_L1b_1500ms"] = res["total_p95_ms"] <= 1500
    res["pass_target_700ms"] = res["total_p95_ms"] <= 700
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
