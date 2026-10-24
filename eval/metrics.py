"""§13.3 / §18.2 metrics: confusion matrix, counts, Wilson intervals, baselines."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass, field

from eval.types import LEVELS, ArmResult

SECONDS_PER_QUESTION = 13


@dataclass(frozen=True)
class ArmSummary:
    matrix: dict[str, dict[str, int]]
    catch: tuple[int, int]
    false_flag: tuple[int, int]
    friction: tuple[int, int]
    misses: list[str]
    questions_mean: float
    questions_max: int
    catch_label: str
    false_flag_label: str
    friction_label: str
    default_fired_rate: tuple[int, int]
    validator_rejections: int
    time_mean_s: float
    time_max_s: int
    catch_wilson: tuple[float, float]
    false_flag_wilson: tuple[float, float]
    baselines: dict[str, ArmSummary] = field(default_factory=dict)


def wilson_interval(
    successes: int, n: int, z: float = 1.96
) -> tuple[float, float]:
    if n <= 0:
        return (0.0, 1.0)
    p = successes / n
    z2 = z * z
    denom = 1.0 + z2 / n
    center = (p + z2 / (2.0 * n)) / denom
    margin = z * math.sqrt((p * (1.0 - p) + z2 / (4.0 * n)) / n) / denom
    return (max(0.0, center - margin), min(1.0, center + margin))


def _empty_row() -> dict[str, int]:
    return {level: 0 for level in LEVELS}


def _label(pair: tuple[int, int]) -> str:
    return f"{pair[0]}/{pair[1]}"


def summarize(
    results: Sequence[ArmResult], *, with_baselines: bool = True
) -> ArmSummary:
    matrix = {"coached": _empty_row(), "legitimate": _empty_row()}
    misses: list[str] = []
    catch_n = 0
    coached_n = 0
    flag_n = 0
    legit_n = 0
    friction_n = 0
    questions = [item.questions for item in results]
    defaults = 0
    asked = 0
    rejections = 0

    for item in results:
        row = matrix.setdefault(item.population, _empty_row())
        if item.raw_level not in row:
            row[item.raw_level] = 0
        row[item.raw_level] += 1
        defaults += item.default_fired
        asked += item.questions
        rejections += item.validator_rejections
        if item.population == "coached":
            coached_n += 1
            if item.raw_level in ("Caution", "High"):
                catch_n += 1
            else:
                misses.append(item.scenario_id)
        elif item.population == "legitimate":
            legit_n += 1
            if item.raw_level == "High":
                flag_n += 1
            if item.raw_level in ("Caution", "High"):
                friction_n += 1

    catch = (catch_n, coached_n)
    false_flag = (flag_n, legit_n)
    friction = (friction_n, legit_n)
    q_mean = sum(questions) / len(questions) if questions else 0.0
    q_max = max(questions) if questions else 0

    summary = ArmSummary(
        matrix=matrix,
        catch=catch,
        false_flag=false_flag,
        friction=friction,
        misses=misses,
        questions_mean=q_mean,
        questions_max=q_max,
        catch_label=_label(catch),
        false_flag_label=_label(false_flag),
        friction_label=_label(friction),
        default_fired_rate=(defaults, asked),
        validator_rejections=rejections,
        time_mean_s=q_mean * SECONDS_PER_QUESTION,
        time_max_s=q_max * SECONDS_PER_QUESTION,
        catch_wilson=wilson_interval(*catch),
        false_flag_wilson=wilson_interval(*false_flag),
    )
    if with_baselines:
        object.__setattr__(
            summary,
            "baselines",
            {
                "always-Clear": summarize(
                    _forced(results, "Clear"), with_baselines=False
                ),
                "always-Caution": summarize(
                    _forced(results, "Caution"), with_baselines=False
                ),
                "always-High": summarize(
                    _forced(results, "High"), with_baselines=False
                ),
            },
        )
    return summary


def _forced(results: Sequence[ArmResult], level: str) -> list[ArmResult]:
    out: list[ArmResult] = []
    for item in results:
        out.append(
            ArmResult(
                scenario_id=item.scenario_id,
                population=item.population,
                label=item.label,
                raw_level=level,
                score=item.score,
                questions=item.questions,
                asked=item.asked,
                default_fired=item.default_fired,
                validator_rejections=0,
                concerning_count=item.concerning_count,
                trace=(),
            )
        )
    return out
