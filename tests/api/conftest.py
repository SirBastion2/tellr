"""API test helpers. Schema checks reuse the contract checker style (no extra deps)."""

from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "contract" / "fixtures"
SESSION_SCHEMA = json.loads(
    (ROOT / "contract" / "session_state.schema.json").read_text(encoding="utf-8")
)
ERROR_SCHEMA = json.loads((ROOT / "contract" / "error.schema.json").read_text(encoding="utf-8"))
IGNORE_FIELDS = frozenset({"session_id", "debug"})


def _is_type(value: object, type_name: str) -> bool:
    if type_name == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if type_name == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    return isinstance(
        value, {"object": dict, "array": list, "string": str, "boolean": bool}[type_name]
    )


def validate(value: object, schema: dict, path: str, errors: list[str]) -> None:
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
                validate(value[key], sub, f"{path}.{key}", errors)
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            errors.append(f"{path}: fewer than {schema['minItems']} items")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(f"{path}: more than {schema['maxItems']} items")
        item_schema = schema.get("items")
        if item_schema is not None:
            for i, item in enumerate(value):
                validate(item, item_schema, f"{path}[{i}]", errors)
    if _is_type(value, "number") and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{path}: below {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{path}: above {schema['maximum']}")


def assert_session_state(payload: object) -> None:
    errors: list[str] = []
    validate(payload, SESSION_SCHEMA, "SessionState", errors)
    assert errors == [], errors
    assert isinstance(payload, dict)
    assert "_engine" not in payload


def assert_error_body(payload: object) -> None:
    errors: list[str] = []
    validate(payload, ERROR_SCHEMA, "ErrorResponse", errors)
    assert errors == [], errors


def comparable(state: dict) -> dict:
    return {key: value for key, value in state.items() if key not in IGNORE_FIELDS}


def load_cases() -> list[dict]:
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(FIXTURES.glob("T*.json"))
    ]


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    from api.main import create_app

    app = create_app(db_path=tmp_path / "teller.sqlite")
    with TestClient(app) as test_client:
        yield test_client
