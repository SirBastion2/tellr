"""Write results.json and report.md (architecture §13.3, §13.4)."""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

from eval.metrics import ArmSummary
from eval.types import LEVELS, ArmResult


def _pct(interval: tuple[float, float]) -> str:
    lo, hi = interval
    return f"{lo * 100:.0f}–{hi * 100:.0f}%"


def _matrix_block(summary: ArmSummary) -> str:
    lines = [
        "| | Clear | Caution | High |",
        "|---|---:|---:|---:|",
    ]
    for pop in ("coached", "legitimate"):
        row = summary.matrix.get(pop, {})
        total = sum(row.get(level, 0) for level in LEVELS)
        lines.append(
            f"| {pop} ({total}) | {row.get('Clear', 0)} | "
            f"{row.get('Caution', 0)} | {row.get('High', 0)} |"
        )
    return "\n".join(lines)


def _summary_json(summary: ArmSummary, *, include_baselines: bool) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "matrix": summary.matrix,
        "catch": list(summary.catch),
        "catch_label": summary.catch_label,
        "false_flag": list(summary.false_flag),
        "false_flag_label": summary.false_flag_label,
        "friction": list(summary.friction),
        "friction_label": summary.friction_label,
        "misses": list(summary.misses),
        "questions_mean": summary.questions_mean,
        "questions_max": summary.questions_max,
        "time_mean_s": summary.time_mean_s,
        "time_max_s": summary.time_max_s,
        "default_fired_rate": list(summary.default_fired_rate),
        "validator_rejections": summary.validator_rejections,
        "catch_wilson": list(summary.catch_wilson),
        "false_flag_wilson": list(summary.false_flag_wilson),
    }
    if include_baselines:
        payload["baselines"] = {
            name: _summary_json(item, include_baselines=False)
            for name, item in summary.baselines.items()
        }
    return payload


def _result_json(item: ArmResult) -> dict[str, Any]:
    return {
        "scenario_id": item.scenario_id,
        "label": item.label,
        "population": item.population,
        "raw_level": item.raw_level,
        "score": item.score,
        "questions": item.questions,
        "asked": list(item.asked),
        "default_fired": item.default_fired,
        "validator_rejections": item.validator_rejections,
        "concerning_count": item.concerning_count,
        "trace": [dict(step) for step in item.trace],
    }


def results_payload(
    *,
    git_sha: str,
    library_version: str,
    arms: Mapping[str, Sequence[ArmResult]],
    summaries: Mapping[str, ArmSummary],
) -> dict[str, Any]:
    return {
        "git_sha": git_sha,
        "library_version": library_version,
        "config": {
            "temperature": 0,
            "batch_size": 1,
            "prefetch": False,
            "timeout_ms": None,
        },
        "arms": {
            name: {
                "per_scenario": [_result_json(item) for item in rows],
                "metrics": _summary_json(summaries[name], include_baselines=True),
            }
            for name, rows in arms.items()
        },
    }


def render_report(
    *,
    git_sha: str,
    library_version: str,
    summaries: Mapping[str, ArmSummary],
    arms: Mapping[str, Sequence[ArmResult]],
) -> str:
    lines = [
        "# Eval report",
        "",
        f"- git: `{git_sha}`",
        f"- library_version: `{library_version}`",
        "- config: temperature 0, batch size 1, prefetch off, timeout off (§13.4)",
        "",
        (
            "Counts, not percentages. Wilson intervals are 95%. "
            "Do not call an arm difference significant on 15 scenarios (§13.3)."
        ),
        "",
    ]
    for name, summary in summaries.items():
        fired, asked = summary.default_fired_rate
        lines.extend(
            [
                f"## Arm {name}",
                "",
                "### Confusion matrix",
                "",
                _matrix_block(summary),
                "",
                "### Headlines",
                "",
                (
                    f"- Catch rate: `{summary.catch_label}` "
                    f"(95% Wilson {_pct(summary.catch_wilson)})"
                ),
                (
                    f"- False-flag rate: `{summary.false_flag_label}` "
                    f"(95% Wilson {_pct(summary.false_flag_wilson)})"
                ),
                f"- Friction rate: `{summary.friction_label}`",
                (
                    f"- Questions to decision: mean {summary.questions_mean:.2f}, "
                    f"max {summary.questions_max}"
                ),
                (
                    f"- Time to decision (scripted): mean {summary.time_mean_s:.0f}s, "
                    f"max {summary.time_max_s}s (questions × 13s)"
                ),
                f"- default_fired_rate: {fired}/{asked}",
                f"- Validator rejections: {summary.validator_rejections}",
                "",
            ]
        )
        if summary.misses:
            lines.append("Misses (coached finishing Clear):")
            lines.append("")
            by_id = {item.scenario_id: item for item in arms[name]}
            for sid in summary.misses:
                label = by_id[sid].label if sid in by_id else sid
                lines.append(f"- `{sid}` — {label}")
            lines.append("")
        else:
            lines.append("Misses: none.")
            lines.append("")
        lines.extend(
            [
                "### Per scenario",
                "",
                "| id | population | raw | questions |",
                "|---|---|---|---:|",
            ]
        )
        for item in arms[name]:
            lines.append(
                f"| `{item.scenario_id}` | {item.population} | "
                f"{item.raw_level} | {item.questions} |"
            )
        lines.append("")
        lines.extend(["### Trivial baselines", ""])
        for bname, baseline in summary.baselines.items():
            lines.append(
                f"- {bname}: catch `{baseline.catch_label}`, "
                f"false-flag `{baseline.false_flag_label}`, "
                f"friction `{baseline.friction_label}`"
            )
        lines.append("")
    return "\n".join(lines) + "\n"


def write_outputs(out_dir: Path, payload: dict[str, Any], report: str) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "results.json").write_text(
        json.dumps(payload, indent=2, sort_keys=False) + "\n", encoding="utf-8"
    )
    (out_dir / "report.md").write_text(report, encoding="utf-8")
