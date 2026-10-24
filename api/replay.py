"""Practice replay logs (§14.2) in the web `--replay` fixture-step format.

Recorded from the live FastAPI routes. Replay posts the same requests through
those routes (TestClient; no network). Driver B can re-record on a GPU laptop.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml
from fastapi.testclient import TestClient

from api.main import create_app
from engine import load_library
from recommenders.fake import FakeRecommender
from store import sqlite as store

ROOT = Path(__file__).resolve().parents[1]
REPLAY_DIR = Path(__file__).resolve().parent / "replays"
DEV_SCENARIOS = ROOT / "eval" / "scenarios" / "dev"
AMOUNT_BAND = "5000_9999"
MAX_QUESTIONS = 7
ACTOR = "teller"
FORMAT = "teller-copilot-replay/1"
CPU_NOTE = (
    "Recorded on a CPU-only VM with RECOMMENDER=fake (deterministic first "
    "candidate, no llama-server). No GPU was available. Driver B can re-record "
    "on the GPU laptop with RECOMMENDER=local."
)

SCRIPTS = {
    "T1": DEV_SCENARIOS / "scn.legitimate.t1_contractor_on_phone.yaml",
    "T3": DEV_SCENARIOS / "scn.coached.t3_renovation_cover.yaml",
}
FILENAMES = {
    "T1": "t1_legitimate.json",
    "T3": "t3_coached.json",
}
LOG_NAMES = tuple(FILENAMES[case] for case in ("T1", "T3"))
_GPU_RECS = frozenset({"local", "local_llm"})
_FAKE_RECS = frozenset({"fake", "fake_llm"})


class ReplayError(ValueError):
    """Replay log is missing, malformed, or diverged from the live path."""


def refuse_heldout(path: Path) -> None:
    if "heldout" in path.resolve().parts:
        raise ReplayError("refusing held-out scenarios (architecture §13.4)")


def load_script(path: Path) -> dict[str, Any]:
    refuse_heldout(path)
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ReplayError(f"{path}: scenario must be a mapping")
    chips = raw.get("context_chips") or []
    answers = raw.get("answers") or {}
    return {
        "id": str(raw["id"]),
        "label": str(raw["label"]),
        "population": str(raw["population"]),
        "stated_purpose": str(raw["stated_purpose"]),
        "context_chips": [str(chip) for chip in chips],
        "answers": {str(key): str(value) for key, value in dict(answers).items()},
        "default": str(raw.get("default") or "vague"),
    }


def parse_log(path: Path) -> dict[str, Any]:
    """Load a web `--replay` log (case/label/steps) plus the §14.2 event log."""
    refuse_heldout(path)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ReplayError(f"{path}: invalid JSON") from exc
    if not isinstance(data, dict):
        raise ReplayError(f"{path}: replay log must be an object")
    for key in (
        "case",
        "label",
        "steps",
        "events",
        "mode",
        "gpu",
        "recommender",
        "scenario_id",
        "population",
        "session",
    ):
        if key not in data:
            raise ReplayError(f"{path}: missing {key!r}")
    if data["mode"] != "practice":
        raise ReplayError(f"{path}: mode must be practice (J-01 / §14.1)")
    if "heldout" in str(data["scenario_id"]):
        raise ReplayError(f"{path}: held-out scenario_id is not allowed")
    steps = data["steps"]
    events = data["events"]
    if not isinstance(steps, list) or not steps:
        raise ReplayError(f"{path}: steps must be a non-empty list")
    if not isinstance(events, list) or not events:
        raise ReplayError(f"{path}: events must be a non-empty list")
    for index, step in enumerate(steps):
        if not isinstance(step, dict):
            raise ReplayError(f"{path}: step {index} must be an object")
        for field in ("endpoint", "request", "response"):
            if field not in step:
                raise ReplayError(f"{path}: step {index} missing {field!r}")
        response = step["response"]
        if not isinstance(response, dict) or not response.get("session_id"):
            raise ReplayError(f"{path}: step {index} response needs session_id")
    session = data["session"]
    if not isinstance(session, dict) or not session.get("session_id"):
        raise ReplayError(f"{path}: session.session_id is required")
    return data


def _post_step(client: TestClient, session_id: str | None, step: dict[str, Any]):
    endpoint = str(step["endpoint"])
    body = step["request"]
    if endpoint == "POST /sessions":
        return client.post("/sessions", json=body)
    if session_id is None:
        raise ReplayError(f"{endpoint} needs an open session")
    if endpoint.endswith("/context"):
        return client.post(f"/sessions/{session_id}/context", json=body)
    if endpoint.endswith("/answers"):
        return client.post(f"/sessions/{session_id}/answers", json=body)
    if endpoint.endswith("/outcome"):
        return client.post(f"/sessions/{session_id}/outcome", json=body)
    if endpoint.endswith("/undo"):
        return client.post(f"/sessions/{session_id}/undo")
    raise ReplayError(f"unexpected replay endpoint {endpoint}")


def replay_steps(client: TestClient, log: dict[str, Any]) -> list[dict[str, Any]]:
    """Replay recorded requests through the live FastAPI routes. No network."""
    session_id: str | None = None
    states: list[dict[str, Any]] = []
    for index, step in enumerate(log["steps"]):
        response = _post_step(client, session_id, step)
        if response.status_code != 200:
            raise ReplayError(
                f"step {index} {step['endpoint']} -> {response.status_code}: "
                f"{response.text}"
            )
        payload = response.json()
        session_id = str(payload["session_id"])
        states.append(payload)
    return states


def load_into_store(conn: Any, log: dict[str, Any]) -> str:
    """Insert the recorded session and event log. GET /sessions/{id} uses render()."""
    session = log["session"]
    session_id = str(session["session_id"])
    if store.get_session(conn, session_id) is None:
        store.create_session(
            conn,
            session_id,
            mode=str(session.get("mode") or "practice"),
            opened_at=str(session.get("opened_at") or ""),
            library_version=str(session.get("library_version") or ""),
            scenario_id=session.get("scenario_id"),
        )
    if store.load_events(conn, session_id):
        return session_id
    for event in log["events"]:
        payload = {key: value for key, value in dict(event).items() if key != "seq"}
        store.append_event(conn, session_id, payload)
    closed_at = session.get("closed_at")
    if closed_at:
        store.close_session(conn, session_id, str(closed_at))
    return session_id


def _answer_body(
    question_id: str, scenario: dict[str, Any], library: Any
) -> dict[str, str]:
    question = next((item for item in library.questions if item.id == question_id), None)
    if question is None:
        raise ReplayError(f"unknown question {question_id}")
    chip = scenario["answers"].get(question.intent, scenario["default"])
    body: dict[str, str] = {"question_id": question_id, "chip": chip}
    if question.role == "opener" or question.records_purpose:
        body["purpose"] = scenario["stated_purpose"]
    return body


def resolve_record_settings(
    *,
    recommender: str | None = None,
    llama_server: str | None = None,
    model_id: str | None = None,
) -> tuple[str, str | None, str | None]:
    """Record uses env + optional CLI; default stays fake (same as a CPU-only VM)."""
    rec = recommender or os.environ.get("RECOMMENDER") or "fake"
    server = llama_server if llama_server is not None else os.environ.get("LLAMA_SERVER")
    mid = model_id if model_id is not None else os.environ.get("MODEL_ID")
    return rec, server, mid


def log_fields_from_app(app: Any) -> dict[str, Any]:
    """gpu / recommender / model_id / note from the app that actually recorded."""
    rec = str(getattr(app.state, "recommender", "fake"))
    model_id = getattr(app.state, "model_id", None)
    impl = getattr(app.state, "recommender_impl", None)
    impl_name = type(impl).__name__ if impl is not None else ""
    gpu = rec in _GPU_RECS or impl_name == "LocalLLM"
    if not model_id and rec in _FAKE_RECS:
        model_id = FakeRecommender.MODEL_ID
    if rec in _FAKE_RECS or impl_name == "FakeRecommender":
        note = CPU_NOTE
    elif gpu:
        note = (
            f"Recorded with RECOMMENDER={rec} against llama-server "
            f"(model_id={model_id}). gpu=true."
        )
    else:
        note = f"Recorded with RECOMMENDER={rec} (model_id={model_id}). gpu=false."
    return {
        "gpu": bool(gpu),
        "recommender": rec,
        "model_id": model_id,
        "note": note,
    }


def record_practice(
    scenario_path: Path,
    *,
    case: str,
    recommender: str | None = None,
    llama_server: str | None = None,
    model_id: str | None = None,
) -> dict[str, Any]:
    """Drive the live API in practice mode with a committed dev scenario script."""
    refuse_heldout(scenario_path)
    scenario = load_script(scenario_path)
    library = load_library(ROOT / "library")
    rec, server, mid = resolve_record_settings(
        recommender=recommender, llama_server=llama_server, model_id=model_id
    )
    steps: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory() as tmp:
        app = create_app(
            db_path=Path(tmp) / "teller.sqlite",
            recommender=rec,
            llama_server=server,
            model_id=mid,
        )
        with TestClient(app) as client:
            open_req = {
                "mode": "practice",
                "amount_band": AMOUNT_BAND,
                "scenario_id": scenario["id"],
            }
            response = client.post("/sessions", json=open_req)
            if response.status_code != 200:
                raise ReplayError(f"open failed: {response.text}")
            state = response.json()
            session_id = str(state["session_id"])
            steps.append(
                {"endpoint": "POST /sessions", "request": open_req, "response": state}
            )

            context_req = {"chips": list(scenario["context_chips"])}
            response = client.post(f"/sessions/{session_id}/context", json=context_req)
            if response.status_code != 200:
                raise ReplayError(f"context failed: {response.text}")
            state = response.json()
            steps.append(
                {
                    "endpoint": "POST /sessions/{id}/context",
                    "request": context_req,
                    "response": state,
                }
            )

            for _ in range(MAX_QUESTIONS):
                if state.get("stop") or not state.get("question"):
                    break
                answer_req = _answer_body(state["question"]["id"], scenario, library)
                response = client.post(
                    f"/sessions/{session_id}/answers", json=answer_req
                )
                if response.status_code != 200:
                    raise ReplayError(f"answer failed: {response.text}")
                state = response.json()
                steps.append(
                    {
                        "endpoint": "POST /sessions/{id}/answers",
                        "request": answer_req,
                        "response": state,
                    }
                )

            outcome = str(state.get("suggested_outcome") or "proceed")
            outcome_req = {"outcome": outcome, "actor": ACTOR}
            response = client.post(f"/sessions/{session_id}/outcome", json=outcome_req)
            if response.status_code != 200:
                raise ReplayError(f"outcome failed: {response.text}")
            state = response.json()
            steps.append(
                {
                    "endpoint": "POST /sessions/{id}/outcome",
                    "request": outcome_req,
                    "response": state,
                }
            )

            events = store.load_events(app.state.db, session_id)
            row = store.get_session(app.state.db, session_id)
            meta = log_fields_from_app(app)

    if row is None:
        raise ReplayError("recorded session missing from the store")
    return {
        "format": FORMAT,
        "case": case,
        "label": scenario["label"],
        "population": scenario["population"],
        "scenario_id": scenario["id"],
        "script": str(scenario_path.relative_to(ROOT)),
        "mode": "practice",
        "gpu": meta["gpu"],
        "recommender": meta["recommender"],
        "model_id": meta["model_id"],
        "recorded_at": datetime.now(UTC).replace(tzinfo=None).strftime("%Y-%m-%dT%H:%M:%S"),
        "library_version": library.library_version,
        "note": meta["note"],
        "session": {
            "session_id": session_id,
            "mode": row["mode"],
            "opened_at": row["opened_at"],
            "closed_at": row["closed_at"],
            "library_version": row["library_version"],
            "scenario_id": row["scenario_id"],
        },
        "events": events,
        "steps": steps,
    }


def write_log(path: Path, log: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(log, indent=2) + "\n", encoding="utf-8")
    return path


def record_demo_logs(
    out_dir: Path | None = None, *, recommender: str | None = None
) -> list[Path]:
    dest = out_dir or REPLAY_DIR
    dest.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for case, script in SCRIPTS.items():
        path = dest / FILENAMES[case]
        write_log(path, record_practice(script, case=case, recommender=recommender))
        written.append(path)
    return written


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Record or replay J-01 practice logs.")
    parser.add_argument(
        "command",
        choices=("record", "replay"),
        help="record writes api/replays/*.json; replay checks them on the live path",
    )
    parser.add_argument(
        "--out",
        default=str(REPLAY_DIR),
        help="directory for recorded logs (default: api/replays)",
    )
    parser.add_argument(
        "--replay",
        dest="replay_path",
        default=None,
        help="single log to replay (default: both committed logs)",
    )
    parser.add_argument(
        "--recommender",
        default=None,
        help="record only: override $RECOMMENDER (default: env, else fake). Replay stays fake.",
    )
    args = parser.parse_args(argv)
    if args.command == "record":
        paths = record_demo_logs(Path(args.out), recommender=args.recommender)
        for path in paths:
            print(f"wrote {path}")
        return 0

    targets = (
        [Path(args.replay_path)]
        if args.replay_path
        else [REPLAY_DIR / name for name in LOG_NAMES]
    )
    with tempfile.TemporaryDirectory() as tmp:
        for index, path in enumerate(targets):
            log = parse_log(path)
            app = create_app(
                db_path=Path(tmp) / f"replay-{index}.sqlite", recommender="fake"
            )
            with TestClient(app) as client:
                states = replay_steps(client, log)
            if len(states) != len(log["steps"]):
                raise ReplayError(f"{path}: replay length mismatch")
            print(f"replayed {path} ({len(states)} steps, no network)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
