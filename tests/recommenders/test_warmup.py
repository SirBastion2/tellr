"""X-003 part 1: local_llm startup warm-up must not count as live latency."""

from __future__ import annotations

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from fastapi.testclient import TestClient
from tests.recommenders.conftest import FakeRecommender, t2_steps

COLD_DELAY_S = 1.8
WARM_BODY = {"content": '{"next_question_id": "q.secrecy.told_not_to_tell"}'}


class _FakeLlama:
    """llama-server stand-in: first /completion is cold, later ones are warm."""

    def __init__(self, *, cold_delay_s: float = COLD_DELAY_S) -> None:
        self.cold_delay_s = cold_delay_s
        self.hits: list[dict] = []
        self._lock = threading.Lock()
        parent = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length)
                try:
                    payload = json.loads(raw.decode() or "{}")
                except json.JSONDecodeError:
                    payload = {}
                with parent._lock:
                    index = len(parent.hits)
                    parent.hits.append({"path": self.path, "body": payload})
                if index == 0 and parent.cold_delay_s:
                    time.sleep(parent.cold_delay_s)
                body = json.dumps(WARM_BODY).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, format: str, *args: object) -> None:
                return

        self._server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self._server.server_address[1]}"
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)

    def start(self) -> str:
        self._thread.start()
        return self.url

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()
        self._thread.join(timeout=2)


def _walk_t2(client: TestClient, through: int) -> str:
    session_id: str | None = None
    for step in t2_steps()[: through + 1]:
        endpoint = step["endpoint"]
        body = step["request"]
        if endpoint == "POST /sessions":
            response = client.post("/sessions", json=body)
        elif endpoint.endswith("/context"):
            assert session_id is not None
            response = client.post(f"/sessions/{session_id}/context", json=body)
        else:
            assert session_id is not None
            response = client.post(f"/sessions/{session_id}/answers", json=body)
        assert response.status_code == 200, response.text
        session_id = response.json()["session_id"]
    assert session_id is not None
    return session_id


def test_warmup_does_not_break_startup_without_server(tmp_path: Path) -> None:
    from api.main import create_app
    from recommenders.metrics import Metrics

    metrics = Metrics()
    t0 = time.perf_counter()
    app = create_app(
        db_path=tmp_path / "teller.sqlite",
        recommender="local_llm",
        model_id="Meta-Llama-3.1-8B-Instruct-Q4_K_M",
        llama_server="http://127.0.0.1:9",
        timeout_ms=1500,
        warmup_timeout_ms=2000,
        metrics=metrics,
    )
    with TestClient(app) as client:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        body = client.get("/health").json()
    assert elapsed_ms < 2500
    assert body["recommender"] == "local_llm"
    assert body["p50"] is None
    assert body["p95"] is None
    assert body["fallback_rate"] == 0.0
    assert body["rejection_count"] == 0
    assert metrics.attempts == 0


def test_warmup_hits_server_and_is_omitted_from_health(tmp_path: Path) -> None:
    from api.main import create_app
    from recommenders.metrics import Metrics

    fake = _FakeLlama(cold_delay_s=0.05)
    metrics = Metrics()
    try:
        url = fake.start()
        app = create_app(
            db_path=tmp_path / "teller.sqlite",
            recommender="local_llm",
            model_id="Meta-Llama-3.1-8B-Instruct-Q4_K_M",
            llama_server=url,
            timeout_ms=1500,
            warmup_timeout_ms=2000,
            metrics=metrics,
        )
        with TestClient(app) as client:
            assert fake.hits, "startup must POST /completion to warm llama-server"
            assert fake.hits[0]["path"] == "/completion"
            body = fake.hits[0]["body"]
            assert body.get("cache_prompt") is True
            assert "grammar" in body
            assert "prompt" in body
            health = client.get("/health").json()
            assert health["p50"] is None
            assert health["p95"] is None
            assert health["fallback_rate"] == 0.0
            assert health["rejection_count"] == 0
            assert metrics.attempts == 0
            assert metrics.fallbacks == 0
    finally:
        fake.stop()


def test_rules_recommender_does_not_warmup(tmp_path: Path) -> None:
    from api.main import create_app

    fake = _FakeLlama(cold_delay_s=0.0)
    try:
        url = fake.start()
        app = create_app(
            db_path=tmp_path / "teller.sqlite",
            recommender="rules",
            llama_server=url,
        )
        with TestClient(app) as client:
            assert client.get("/health").json()["recommender"] == "rules"
        assert fake.hits == []
    finally:
        fake.stop()


def test_injected_impl_does_not_warmup(tmp_path: Path) -> None:
    from api.main import create_app

    fake = _FakeLlama(cold_delay_s=0.0)
    try:
        url = fake.start()
        app = create_app(
            db_path=tmp_path / "teller.sqlite",
            recommender="local_llm",
            llama_server=url,
            recommender_impl=FakeRecommender("q.secrecy.told_not_to_tell"),
        )
        with TestClient(app) as client:
            client.get("/health")
        assert fake.hits == []
    finally:
        fake.stop()


def test_first_live_request_falls_back_without_warmup(tmp_path: Path) -> None:
    from api.main import create_app
    from recommenders.metrics import Metrics

    fake = _FakeLlama(cold_delay_s=COLD_DELAY_S)
    metrics = Metrics()
    try:
        url = fake.start()
        app = create_app(
            db_path=tmp_path / "teller.sqlite",
            recommender="local_llm",
            model_id="test-8b",
            llama_server=url,
            timeout_ms=1500,
            warmup=False,
            metrics=metrics,
        )
        with TestClient(app) as client:
            _walk_t2(client, through=3)
            health = client.get("/health").json()
        assert metrics.attempts >= 1
        assert metrics.fallbacks >= 1
        assert health["fallback_rate"] == 1.0
    finally:
        fake.stop()


def test_first_live_request_after_warmup_stays_inside_timeout(tmp_path: Path) -> None:
    from api.main import create_app
    from recommenders.metrics import Metrics

    fake = _FakeLlama(cold_delay_s=COLD_DELAY_S)
    metrics = Metrics()
    try:
        url = fake.start()
        app = create_app(
            db_path=tmp_path / "teller.sqlite",
            recommender="local_llm",
            model_id="test-8b",
            llama_server=url,
            timeout_ms=1500,
            warmup_timeout_ms=5000,
            metrics=metrics,
        )
        with TestClient(app) as client:
            assert len(fake.hits) >= 1
            _walk_t2(client, through=3)
            health = client.get("/health").json()
        assert len(fake.hits) >= 2
        assert metrics.attempts >= 1
        assert metrics.fallbacks == 0
        assert health["fallback_rate"] == 0.0
        assert health["p95"] is not None
        assert health["p95"] < 1500
    finally:
        fake.stop()
