"""Replay T1–T7 with RECOMMENDER=local and print /health.

Driver B, on the GPU laptop, after llama-server is serving the chosen GGUF:

    scripts/with-gpu env RECOMMENDER=local \\
      MODEL_ID=Meta-Llama-3.1-8B-Instruct-Q4_K_M \\
      LLAMA_SERVER=http://127.0.0.1:8080 \\
      python3 -m recommenders.live_path

Then repeat with the 3B loaded in llama-server and MODEL_ID=Llama-3.2-3B-Instruct-Q4_K_M.
Compare the printed rule vs model question IDs. This is the live-path p95, not A-03's
benchmark.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

from api.main import create_app
from engine import candidates as engine_candidates
from engine import load_library, project, rule_choice

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "contract" / "fixtures"


def _cases() -> list[dict]:
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(FIXTURES.glob("T*.json"))
    ]


def _post(client: TestClient, session_id: str | None, step: dict) -> object:
    endpoint = step["endpoint"]
    body = step["request"]
    if endpoint == "POST /sessions":
        return client.post("/sessions", json=body)
    assert session_id is not None
    if endpoint.endswith("/context"):
        return client.post(f"/sessions/{session_id}/context", json=body)
    if endpoint.endswith("/answers"):
        return client.post(f"/sessions/{session_id}/answers", json=body)
    raise AssertionError(endpoint)


def replay(client: TestClient, library) -> list[dict]:
    rows: list[dict] = []
    for case in _cases():
        session_id = None
        events: list[dict] = []
        for index, step in enumerate(case["steps"]):
            response = _post(client, session_id, step)
            payload = response.json()
            session_id = payload["session_id"]
            kind = step["endpoint"]
            if kind == "POST /sessions":
                events.append(
                    {
                        "type": "SessionOpened",
                        "mode": step["request"]["mode"],
                        "amount_band": step["request"]["amount_band"],
                        "library_version": library.library_version,
                    }
                )
            elif kind.endswith("/context"):
                events.append({"type": "ContextAdded", "chips": step["request"]["chips"]})
            elif kind.endswith("/answers"):
                req = step["request"]
                events.append(
                    {
                        "type": "AnswerRecorded",
                        "question_id": req["question_id"],
                        "chip": req["chip"],
                        "purpose": req.get("purpose"),
                    }
                )
            state = project(events, library)
            stage, cands = engine_candidates(state, library)
            if stage != "probe" or state.get("stop") or not cands:
                continue
            question = payload.get("question") or {}
            rows.append(
                {
                    "case": case["case"],
                    "step": index,
                    "rule_id": rule_choice(cands),
                    "model_id": question.get("id"),
                    "source": question.get("source"),
                }
            )
    return rows


def main() -> None:
    library = load_library(ROOT / "library")
    rec = os.environ.get("RECOMMENDER", "local")
    model_id = os.environ.get("MODEL_ID", "Meta-Llama-3.1-8B-Instruct-Q4_K_M")
    with tempfile.TemporaryDirectory() as tmp:
        app = create_app(
            db_path=Path(tmp) / "live-path.sqlite",
            recommender=rec,
            model_id=model_id,
        )
        with TestClient(app) as client:
            rows = replay(client, library)
            health = client.get("/health").json()
    print(json.dumps({"health": health, "probe_turns": rows}, indent=2))
    agreed = sum(1 for row in rows if row["rule_id"] == row["model_id"])
    print(
        f"probe turns={len(rows)} agreed_with_rules={agreed} "
        f"p95={health.get('p95')} fallback_rate={health.get('fallback_rate')}",
        flush=True,
    )


if __name__ == "__main__":
    main()
