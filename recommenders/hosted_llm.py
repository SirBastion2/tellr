"""HostedLLM: provider chat API. No grammar assumed; the same validator still runs."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from engine.library import Library
from recommenders.base import Recommendation
from recommenders.http import post_json
from recommenders.local_llm import _prompt_for
from recommenders.validate import parse_question_id


class HostedLLM:
    def __init__(
        self,
        *,
        url: str,
        model_id: str | None = None,
        api_key: str | None = None,
        timeout_ms: int = 1500,
        library: Library | None = None,
    ) -> None:
        self.url = url.rstrip("/")
        self.model_id = model_id
        self.api_key = api_key
        self.timeout_ms = timeout_ms
        self.library = library

    def next(self, state: Any, candidates: Sequence[Any]) -> Recommendation:
        headers: dict[str, str] = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        payload = post_json(
            f"{self.url}/v1/chat/completions",
            {
                "model": self.model_id,
                "temperature": 0,
                "messages": [
                    {
                        "role": "user",
                        "content": _prompt_for(state, candidates, self.library),
                    }
                ],
            },
            headers=headers,
            timeout_s=max(0.05, self.timeout_ms / 1000.0),
        )
        choices = payload.get("choices") or []
        message = (choices[0].get("message") or {}) if choices else {}
        raw = message.get("content", "")
        return Recommendation(
            next_question_id=parse_question_id(raw),
            signals_asserted=[],
        )
