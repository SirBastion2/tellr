"""GET /library is engine.export_library (A1 HANDOFF; contract/api.md)."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from engine import export_library, load_library

ROOT = Path(__file__).resolve().parents[2]


def test_get_library_returns_engine_export(client: TestClient) -> None:
    expected = export_library(load_library(ROOT / "library"))
    response = client.get("/library")
    assert response.status_code == 200, response.text
    assert response.json() == expected
