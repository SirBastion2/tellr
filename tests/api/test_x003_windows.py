"""X-003 part 2: Windows live-path packaging and default DB (no contract change)."""

from __future__ import annotations

import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_setuptools_includes_engine() -> None:
    data = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    include = data["tool"]["setuptools"]["packages"]["find"]["include"]
    assert any(item.startswith("engine") for item in include)


def test_default_db_uses_tempdir_when_teller_db_unset(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.delenv("TELLER_DB", raising=False)
    monkeypatch.setattr("api.main.tempfile.gettempdir", lambda: str(tmp_path))
    from api.main import default_db_path

    assert default_db_path() == tmp_path / "teller-copilot.sqlite"


def test_teller_db_override_is_used(monkeypatch, tmp_path: Path) -> None:
    override = tmp_path / "custom.sqlite"
    monkeypatch.setenv("TELLER_DB", str(override))
    monkeypatch.setattr("api.main.tempfile.gettempdir", lambda: str(tmp_path / "unused"))
    from api.main import default_db_path

    assert default_db_path() == override


def test_create_app_default_db_is_cross_platform(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.delenv("TELLER_DB", raising=False)
    monkeypatch.setattr("api.main.tempfile.gettempdir", lambda: str(tmp_path))
    from api.main import create_app

    app = create_app()
    try:
        listed = app.state.db.execute("PRAGMA database_list").fetchone()
        assert Path(listed[2]).resolve() == (tmp_path / "teller-copilot.sqlite").resolve()
    finally:
        app.state.db.close()
