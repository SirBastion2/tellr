"""J-01 step 1: committed practice replay logs parse and replay on the live API path."""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from tests.api.conftest import assert_session_state, comparable

from api.main import create_app
from api.replay import LOG_NAMES, REPLAY_DIR, parse_log, record_practice, replay_steps
from recommenders.fake import FakeRecommender

ROOT = Path(__file__).resolve().parents[2]
_FAKE = frozenset({"fake", "fake_llm"})
_GPU = frozenset({"local", "local_llm"})


@pytest.fixture
def replay_app(tmp_path: Path) -> Iterator[Any]:
    """Close the sqlite handle before pytest deletes tmp_path (X-006 / Windows)."""
    app = create_app(db_path=tmp_path / "replay.sqlite", recommender="fake")
    try:
        yield app
    finally:
        app.state.db.close()


def assert_recommender_metadata(log: dict) -> None:
    """gpu / model_id / note must match the recommender that recorded the log."""
    rec = log["recommender"]
    gpu = log["gpu"]
    model_id = log["model_id"]
    note = str(log["note"]).lower()
    assert rec
    assert model_id
    assert log["note"]
    assert isinstance(gpu, bool)
    if rec in _FAKE:
        assert gpu is False
        assert model_id == FakeRecommender.MODEL_ID
        assert "fake" in note
    elif rec in _GPU:
        assert gpu is True
        assert model_id != FakeRecommender.MODEL_ID
        assert "gpu" in note or rec in note
    else:
        assert gpu is False
        assert model_id != FakeRecommender.MODEL_ID


@pytest.mark.parametrize("name", LOG_NAMES)
def test_replay_log_parses_and_replays_live_path(name: str, replay_app: Any) -> None:
    log = parse_log(REPLAY_DIR / name)
    assert log["mode"] == "practice"
    assert_recommender_metadata(log)
    assert "heldout" not in str(log["scenario_id"])
    assert (ROOT / "eval" / "scenarios" / "heldout") not in Path(log.get("script", "")).parents
    assert log["steps"], f"{name} has no web --replay steps"
    assert log["events"], f"{name} has no §14.2 event log"

    with TestClient(replay_app) as client:
        states = replay_steps(client, log)
    assert len(states) == len(log["steps"])
    fake_recorded = log["recommender"] in _FAKE
    for index, (got, step) in enumerate(zip(states, log["steps"], strict=True)):
        assert_session_state(got)
        if fake_recorded:
            assert comparable(got) == comparable(step["response"]), (
                f"{name} step {index} {step['endpoint']} diverged from the recorded live run"
            )


def test_replay_logs_are_one_coached_and_one_legitimate() -> None:
    populations = {
        parse_log(REPLAY_DIR / name)["population"] for name in LOG_NAMES
    }
    assert populations == {"coached", "legitimate"}


@pytest.mark.parametrize("name", LOG_NAMES)
def test_event_log_replays_through_live_get(name: str, replay_app: Any) -> None:
    from api.replay import load_into_store

    log = parse_log(REPLAY_DIR / name)
    load_into_store(replay_app.state.db, log)
    session_id = log["session"]["session_id"]
    with TestClient(replay_app) as client:
        fetched = client.get(f"/sessions/{session_id}")
    assert fetched.status_code == 200, fetched.text
    body = fetched.json()
    assert_session_state(body)
    last = log["steps"][-1]["response"]
    assert comparable(body) == comparable(last)
    assert body["session_id"] == session_id


def test_recommender_metadata_accepts_real_model_log() -> None:
    assert_recommender_metadata(
        {
            "recommender": "local",
            "gpu": True,
            "model_id": "Meta-Llama-3.1-8B-Instruct-Q4_K_M",
            "note": (
                "Recorded with RECOMMENDER=local against llama-server "
                "(model_id=Meta-Llama-3.1-8B-Instruct-Q4_K_M). gpu=true."
            ),
        }
    )


def test_record_practice_fake_labels_without_gpu(monkeypatch: pytest.MonkeyPatch) -> None:
    from api.replay import SCRIPTS

    monkeypatch.delenv("RECOMMENDER", raising=False)
    monkeypatch.delenv("MODEL_ID", raising=False)
    monkeypatch.delenv("LLAMA_SERVER", raising=False)
    log = record_practice(SCRIPTS["T1"], case="T1")
    assert log["recommender"] == "fake"
    assert log["gpu"] is False
    assert log["model_id"] == FakeRecommender.MODEL_ID
    assert "fake" in str(log["note"]).lower()
    assert_recommender_metadata(log)


def test_record_practice_passes_env_into_create_app(monkeypatch: pytest.MonkeyPatch) -> None:
    from api.replay import SCRIPTS

    captured: dict[str, object] = {}
    real = create_app

    def spy(**kwargs: object) -> object:
        captured.update(kwargs)
        return real(
            db_path=kwargs.get("db_path"),
            recommender="fake",
            warmup=False,
        )

    monkeypatch.setenv("RECOMMENDER", "local")
    monkeypatch.setenv("LLAMA_SERVER", "http://127.0.0.1:8080")
    monkeypatch.setenv("MODEL_ID", "Meta-Llama-3.1-8B-Instruct-Q4_K_M")
    monkeypatch.setattr("api.replay.create_app", spy)
    record_practice(SCRIPTS["T1"], case="T1")
    assert captured.get("recommender") == "local"
    assert captured.get("llama_server") == "http://127.0.0.1:8080"
    assert captured.get("model_id") == "Meta-Llama-3.1-8B-Instruct-Q4_K_M"


def test_record_practice_recommender_flag_overrides_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from api.replay import SCRIPTS

    captured: dict[str, object] = {}
    real = create_app

    def spy(**kwargs: object) -> object:
        captured.update(kwargs)
        return real(
            db_path=kwargs.get("db_path"),
            recommender="fake",
            warmup=False,
        )

    monkeypatch.setenv("RECOMMENDER", "local")
    monkeypatch.setenv("LLAMA_SERVER", "http://example:9")
    monkeypatch.setenv("MODEL_ID", "other-model")
    monkeypatch.setattr("api.replay.create_app", spy)
    record_practice(
        SCRIPTS["T1"],
        case="T1",
        recommender="fake",
        llama_server="http://127.0.0.1:8080",
        model_id="Meta-Llama-3.1-8B-Instruct-Q4_K_M",
    )
    assert captured.get("recommender") == "fake"
    assert captured.get("llama_server") == "http://127.0.0.1:8080"
    assert captured.get("model_id") == "Meta-Llama-3.1-8B-Instruct-Q4_K_M"


def test_record_practice_closes_sqlite_handle(monkeypatch: pytest.MonkeyPatch) -> None:
    """X-006: the temp teller.sqlite handle must be closed before cleanup."""
    from api.replay import SCRIPTS

    held: list[sqlite3.Connection] = []
    real = create_app

    def spy(**kwargs: object) -> object:
        app = real(
            db_path=kwargs.get("db_path"),
            recommender="fake",
            warmup=False,
        )
        held.append(app.state.db)
        return app

    monkeypatch.delenv("RECOMMENDER", raising=False)
    monkeypatch.delenv("MODEL_ID", raising=False)
    monkeypatch.delenv("LLAMA_SERVER", raising=False)
    monkeypatch.setattr("api.replay.create_app", spy)
    record_practice(SCRIPTS["T1"], case="T1")
    assert held
    with pytest.raises(sqlite3.ProgrammingError):
        held[0].execute("SELECT 1")
