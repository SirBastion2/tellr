"""A-01: GET /library projection validates against contract/library.schema.json."""

from __future__ import annotations

import json
from pathlib import Path

from engine import export_library, load_library

ROOT = Path(__file__).resolve().parents[2]
SHIPPED = ROOT / "library"
SCHEMA = json.loads((ROOT / "contract" / "library.schema.json").read_text(encoding="utf-8"))


def _is_type(value: object, type_name: str) -> bool:
    if type_name == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if type_name == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    return isinstance(
        value, {"object": dict, "array": list, "string": str, "boolean": bool}[type_name]
    )


def _validate(value: object, schema: dict, path: str, errors: list[str]) -> None:
    expected = schema.get("type")
    if expected is not None:
        types = expected if isinstance(expected, list) else [expected]
        if value is None:
            if "null" not in types:
                errors.append(f"{path}: null not allowed")
            return
        if not any(_is_type(value, item) for item in types if item != "null"):
            errors.append(f"{path}: expected {types}, got {type(value).__name__}")
            return
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: {value!r} not in {schema['enum']}")
    if "const" in schema and value != schema["const"]:
        errors.append(f"{path}: must equal {schema['const']}")
    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                errors.append(f"{path}: missing '{key}'")
        props = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for key in value:
                if key not in props:
                    errors.append(f"{path}: unexpected '{key}'")
        for key, sub in props.items():
            if key in value:
                _validate(value[key], sub, f"{path}.{key}", errors)
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            errors.append(f"{path}: fewer than {schema['minItems']} items")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(f"{path}: more than {schema['maxItems']} items")
        item_schema = schema.get("items")
        if item_schema is not None:
            for i, item in enumerate(value):
                _validate(item, item_schema, f"{path}[{i}]", errors)


def test_export_validates_against_library_schema() -> None:
    payload = export_library(load_library(SHIPPED))
    errors: list[str] = []
    _validate(payload, SCHEMA, "library", errors)
    assert errors == []


def test_export_carries_contract_copy_for_six_question_bank() -> None:
    sample = json.loads((ROOT / "contract" / "library.json").read_text(encoding="utf-8"))
    payload = export_library(load_library(SHIPPED))
    assert payload["library_version"] == sample["library_version"]
    by_id = {q["id"]: q for q in payload["questions"]}
    for question in sample["questions"]:
        exported = by_id[question["id"]]
        assert exported["text"] == question["text"]
        assert exported["why"] == question["why"]
        assert exported["chips"] == question["chips"]
        assert exported["intent"] == question["intent"]
        assert exported["kind"] == question["kind"]
        assert exported["role"] == question["role"]
    sample_purposes = {p["id"]: p["label"] for p in sample["purposes"]}
    exported_purposes = {p["id"]: p["label"] for p in payload["purposes"]}
    assert sample_purposes == exported_purposes
    sample_signals = {s["id"]: s for s in sample["signals"]}
    exported_signals = {s["id"]: s for s in payload["signals"]}
    for sid, signal in sample_signals.items():
        assert exported_signals[sid]["label"] == signal["label"]
        assert exported_signals[sid]["rationale"] == signal["rationale"]
        assert exported_signals[sid]["direction"] == signal["direction"]
