"""Model path: LocalLLM, HostedLLM, validator, and /health metrics (A-05)."""

from __future__ import annotations

import os
from typing import Any

from recommenders.base import Recommendation, Recommender
from recommenders.hosted_llm import HostedLLM
from recommenders.local_llm import LocalLLM

DEFAULT_MODEL_ID = "Meta-Llama-3.1-8B-Instruct-Q4_K_M"
FALLBACK_MODEL_ID = "Llama-3.2-3B-Instruct-Q4_K_M"
MODEL_NAMES = frozenset({"local", "local_llm", "hosted", "hosted_llm"})


def build_recommender(
    name: str,
    *,
    library: Any,
    model_id: str | None = None,
    impl: Any = None,
) -> Any:
    if impl is not None:
        return impl
    ident = model_id or os.environ.get("MODEL_ID") or DEFAULT_MODEL_ID
    if name in {"local", "local_llm"}:
        return LocalLLM(
            library,
            server=os.environ.get("LLAMA_SERVER", "http://127.0.0.1:8080"),
            model_id=ident,
        )
    if name in {"hosted", "hosted_llm"}:
        return HostedLLM(
            library,
            url=os.environ.get("HOSTED_LLM_URL", ""),
            model_id=ident,
            api_key=os.environ.get("HOSTED_LLM_API_KEY"),
        )
    return None


__all__ = [
    "DEFAULT_MODEL_ID",
    "FALLBACK_MODEL_ID",
    "MODEL_NAMES",
    "HostedLLM",
    "LocalLLM",
    "Recommendation",
    "Recommender",
    "build_recommender",
]
