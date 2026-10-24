"""Validate eval scenario files against contract/library.json.

Checks intents, chips, purposes, and context chips. Prints no scores;
B-07 relies on that (prompts/A-06.md, architecture §13.1).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - A2 has not landed pyproject yet
    yaml = None  # type: ignore[assignment]

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LIBRARY = ROOT / "contract" / "library.json"
DEFAULT_DEV = ROOT / "eval" / "scenarios" / "dev"

REQUIRED = (
    "id",
    "label",
    "population",
    "pattern_truth",
    "stated_purpose",
    "context_chips",
    "answers",
    "default",
)
OPTIONAL = {"tags", "source"}
ALLOWED = set(REQUIRED) | OPTIONAL
FORBIDDEN = {"age", "appearance", "name", "customer_name", "full_name"}
POPULATIONS = {"coached", "legitimate"}


def load_library(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    intents: dict[str, set[str]] = {}
    for question in data.get("questions") or []:
        intent = question["intent"]
        intents.setdefault(intent, set()).update(question.get("chips") or [])
    return {
        "intents": intents,
        "chips": {c["id"] for c in data.get("chips") or []},
        "purposes": {p["id"] for p in data.get("purposes") or []},
        "context_chips": {c["id"] for c in data.get("context_chips") or []},
    }


def _as_scenarios(raw: Any, origin: Path) -> list[tuple[str, dict[str, Any]]]:
    if raw is None:
        return [(f"{origin}: document is empty", {})]
    if isinstance(raw, list):
        return [(f"{origin}[{i}]", item if isinstance(item, dict) else {"_raw": item})
                for i, item in enumerate(raw)]
    if isinstance(raw, dict):
        return [(str(origin), raw)]
    return [(f"{origin}: expected a mapping or list", {"_raw": raw})]


def validate_scenario(data: Any, library: dict[str, Any], where: str) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict) or "_raw" in data:
        return [f"{where}: scenario must be a mapping"]

    for key in FORBIDDEN:
        if key in data:
            errors.append(f"{where}: forbidden field '{key}'")
    extra = set(data) - ALLOWED - FORBIDDEN
    if extra:
        errors.append(f"{where}: unexpected fields {sorted(extra)}")
    for key in REQUIRED:
        if key not in data:
            errors.append(f"{where}: missing '{key}'")
    if errors:
        return errors

    population = data["population"]
    if population not in POPULATIONS:
        errors.append(f"{where}.population: {population!r} is not coached or legitimate")

    sid = data["id"]
    if not isinstance(sid, str) or not sid.startswith("scn."):
        errors.append(f"{where}.id: must start with 'scn.'")
    elif population in POPULATIONS and not sid.startswith(f"scn.{population}."):
        errors.append(f"{where}.id: {sid!r} does not match population {population!r}")

    if not isinstance(data["label"], str) or not data["label"].strip():
        errors.append(f"{where}.label: must be a non-empty string")

    truth = data["pattern_truth"]
    if population == "coached" and not (
        isinstance(truth, str) and truth.startswith("pat.")
    ):
        errors.append(f"{where}.pattern_truth: coached scenarios need a pat.* id")
    elif population == "legitimate" and truth is not None:
        errors.append(f"{where}.pattern_truth: legitimate scenarios must be null")

    purpose = data["stated_purpose"]
    if purpose not in library["purposes"]:
        errors.append(f"{where}.stated_purpose: unknown purpose {purpose!r}")

    chips = data["context_chips"]
    if not isinstance(chips, list) or any(not isinstance(c, str) for c in chips):
        errors.append(f"{where}.context_chips: must be a list of ids")
    else:
        for chip in chips:
            if chip not in library["context_chips"]:
                errors.append(f"{where}.context_chips: unknown context chip {chip!r}")

    answers = data["answers"]
    if not isinstance(answers, dict):
        errors.append(f"{where}.answers: must be a mapping of intent → chip")
    else:
        for intent, chip in answers.items():
            if intent not in library["intents"]:
                errors.append(f"{where}.answers: unknown intent {intent!r}")
                continue
            allowed = library["intents"][intent]
            if chip not in library["chips"]:
                errors.append(f"{where}.answers.{intent}: unknown chip {chip!r}")
            elif chip not in allowed:
                errors.append(
                    f"{where}.answers.{intent}: chip {chip!r} is not valid on {intent}"
                )

    default = data["default"]
    if default not in library["chips"]:
        errors.append(f"{where}.default: unknown chip {default!r}")

    tags = data.get("tags", [])
    if tags is not None and (
        not isinstance(tags, list) or any(not isinstance(t, str) for t in tags)
    ):
        errors.append(f"{where}.tags: must be a list of strings")

    source = data.get("source")
    if source is not None and not isinstance(source, str):
        errors.append(f"{where}.source: must be a string")

    return errors


def validate_path(path: Path, library_path: Path) -> list[str]:
    if yaml is None:
        return ["PyYAML is required to read scenarios; ask A2 to add pyyaml"]
    library = load_library(library_path)
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    errors: list[str] = []
    for where, item in _as_scenarios(raw, path):
        errors.extend(validate_scenario(item, library, where))
    return errors


def iter_scenario_files(target: Path) -> list[Path]:
    if target.is_file():
        return [target]
    return sorted(target.glob("*.yaml")) + sorted(target.glob("*.yml"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate eval scenario YAML. Prints no scores.")
    parser.add_argument(
        "paths",
        nargs="*",
        default=[str(DEFAULT_DEV)],
        help="Scenario files or directories (default: eval/scenarios/dev)",
    )
    parser.add_argument("--library", default=str(DEFAULT_LIBRARY), help="contract/library.json")
    args = parser.parse_args(argv)

    if yaml is None:
        print("PyYAML is missing. Request pyyaml from A2 in docs/HANDOFF.md.", file=sys.stderr)
        return 2

    library_path = Path(args.library)
    seen: dict[str, Path] = {}
    invalid = 0
    valid = 0
    for spec in args.paths:
        target = Path(spec)
        files = iter_scenario_files(target)
        if not files:
            print(f"FAIL no scenario YAML under {target}")
            invalid += 1
            continue
        for path in files:
            errors = validate_path(path, library_path)
            raw = yaml.safe_load(path.read_text(encoding="utf-8"))
            labels = []
            for where, item in _as_scenarios(raw, path):
                sid = item.get("id") if isinstance(item, dict) else None
                labels.append(sid or where)
                if isinstance(sid, str):
                    if sid in seen:
                        errors.append(f"{path}: duplicate id {sid!r} (also {seen[sid]})")
                    else:
                        seen[sid] = path
            label = labels[0] if len(labels) == 1 else f"{len(labels)} in {path}"
            if errors:
                invalid += 1
                print(f"FAIL {label}")
                for err in errors:
                    print(f"  - {err}")
            else:
                valid += 1
                print(f"OK   {label}")

    if invalid:
        print(f"{invalid} invalid, {valid} valid")
        return 1
    print(f"{valid} scenario(s) valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
