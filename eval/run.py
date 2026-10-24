"""Eval harness CLI (architecture §13).

python -m eval.run --scenarios eval/scenarios/dev --out eval/results/<sha>

Arms A/B/C. --model fake (default) needs no GPU. --model local is arm C
under llama-server (hours 12–15; scripts/with-gpu). Refuses held-out data.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from collections.abc import Callable, Sequence
from pathlib import Path

from engine.library import load_library
from eval.arms.model import FakeModel, LocalModel, run_model
from eval.arms.rules import run_rules
from eval.arms.static import run_static
from eval.metrics import summarize
from eval.report import render_report, results_payload, write_outputs
from eval.scenarios import load_scenarios
from eval.types import ArmResult, Scenario

ROOT = Path(__file__).resolve().parents[1]


def git_sha(repo: Path = ROOT) -> str:
    try:
        return (
            subprocess.check_output(
                ["git", "rev-parse", "HEAD"],
                cwd=repo,
                stderr=subprocess.DEVNULL,
            )
            .decode()
            .strip()
        )
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def _run_arm(
    name: str,
    scenarios: Sequence[Scenario],
    lib,
    model: FakeModel | LocalModel,
) -> list[ArmResult]:
    runners: dict[str, Callable[[Scenario], ArmResult]] = {
        "A": lambda s: run_static(s, lib),
        "B": lambda s: run_rules(s, lib),
        "C": lambda s: run_model(s, lib, model=model),
    }
    if name not in runners:
        raise SystemExit(f"unknown arm {name!r}; expected A, B, or C")
    return [runners[name](scenario) for scenario in scenarios]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run eval arms A/B/C. No held-out.")
    parser.add_argument(
        "--scenarios",
        required=True,
        help="Scenario file or directory (must not be eval/scenarios/heldout)",
    )
    parser.add_argument("--out", required=True, help="Directory for results.json + report.md")
    parser.add_argument("--arms", default="A,B,C", help="Comma-separated A,B,C")
    parser.add_argument(
        "--model",
        default="fake",
        help="fake (no GPU) or local (A-05 LocalLLM; hours 12–15, GPU lock).",
    )
    parser.add_argument("--library", default=str(ROOT / "library"))
    args = parser.parse_args(argv)

    if args.model not in {"fake", "local", "local_llm"}:
        print(
            "unknown --model; use fake or local "
            "(local = A-05 LocalLLM under scripts/with-gpu).",
            file=sys.stderr,
        )
        return 2

    scenarios = load_scenarios(Path(args.scenarios))
    lib = load_library(Path(args.library))
    if args.model == "fake":
        model: FakeModel | LocalModel = FakeModel()
    else:
        model = LocalModel.from_env(lib)
        model.warmup()
    names = [part.strip() for part in args.arms.split(",") if part.strip()]
    if not names:
        print("no arms selected", file=sys.stderr)
        return 2

    arm_rows: dict[str, list[ArmResult]] = {}
    summaries = {}
    for name in names:
        rows = _run_arm(name, scenarios, lib, model)
        arm_rows[name] = rows
        summaries[name] = summarize(rows)

    sha = git_sha()
    payload = results_payload(
        git_sha=sha,
        library_version=lib.library_version,
        arms=arm_rows,
        summaries=summaries,
    )
    report = render_report(
        git_sha=sha,
        library_version=lib.library_version,
        summaries=summaries,
        arms=arm_rows,
    )
    write_outputs(Path(args.out), payload, report)
    print(f"wrote {args.out}/results.json and report.md ({len(scenarios)} scenarios)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
