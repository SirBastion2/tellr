"""LocalLLM: llama-server /completion with a per-request GBNF grammar (§8.2)."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any
from urllib.error import URLError

from engine.library import Library
from engine.prompt import build_prompt, prompt_fields_from_session
from recommenders.base import Recommendation
from recommenders.grammar import generate_grammar
from recommenders.http import post_json
from recommenders.validate import parse_question_id


class LocalLLM:
    def __init__(
        self,
        *,
        server: str = "http://127.0.0.1:8080",
        model_id: str | None = None,
        timeout_ms: int = 1500,
        warmup_timeout_ms: int = 15000,
        library: Library | None = None,
    ) -> None:
        self.server = server.rstrip("/")
        self.model_id = model_id
        self.timeout_ms = timeout_ms
        self.warmup_timeout_ms = warmup_timeout_ms
        self.library = library

    def warmup(self) -> bool:
        """Pay llama-server cold-start cost. Never raises; never for live metrics."""
        ids: list[str] = []
        questions: list[Any] = []
        if self.library is not None:
            questions = [item for item in self.library.questions if item.role != "opener"]
            ids = [item.id for item in questions]
        if not ids:
            ids = ["q.secrecy.told_not_to_tell"]
            questions = ids
        try:
            post_json(
                f"{self.server}/completion",
                {
                    "prompt": _prompt_for({}, questions, self.library),
                    "grammar": generate_grammar(ids),
                    "temperature": 0,
                    "n_predict": 32,
                    "cache_prompt": True,
                    "stream": False,
                },
                timeout_s=max(0.05, self.warmup_timeout_ms / 1000.0),
            )
            return True
        except (OSError, TimeoutError, URLError, ValueError):
            return False

    def next(self, state: Any, candidates: Sequence[Any]) -> Recommendation:
        ids = [item.id if hasattr(item, "id") else str(item) for item in candidates]
        body = {
            "prompt": _prompt_for(state, candidates, self.library),
            "grammar": generate_grammar(ids),
            "temperature": 0,
            "n_predict": 32,
            "cache_prompt": True,
            "stream": False,
        }
        payload = post_json(
            f"{self.server}/completion",
            body,
            timeout_s=max(0.05, self.timeout_ms / 1000.0),
        )
        raw = payload.get("content", payload)
        return Recommendation(
            next_question_id=parse_question_id(raw),
            signals_asserted=[],
        )


def _prompt_for(state: Any, candidates: Sequence[Any], library: Library | None) -> str:
    if isinstance(state, dict) and state.get("_prompt") is not None:
        return build_prompt(state["_prompt"])
    ids = [item.id if hasattr(item, "id") else str(item) for item in candidates]
    if library is not None and isinstance(state, dict):
        events = list(state.get("_events") or ())
        return build_prompt(prompt_fields_from_session(state, events, library, ids))
    pairs = [
        (item.id, getattr(item, "why", "") or "")
        if hasattr(item, "id")
        else (str(item), "")
        for item in candidates
    ]
    return build_prompt(
        {
            "context_chips": [],
            "stated_purpose": None,
            "transcript": [],
            "evidence_ids": [],
            "leading_pattern": None,
            "candidates": pairs,
            "answer_chip_vocabulary": [],
            "purpose_vocabulary": [],
        }
    )
