"""Placeholder FastAPI app so `make dev-api` can bind 127.0.0.1:8000 (architecture §15)."""

from fastapi import FastAPI

app = FastAPI(title="Teller Copilot", version="0.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
