"""LocalLLM: llama-server client with a per-request GBNF grammar (§8.2, §10.3)."""

from __future__ import annotations

import json
import urllib.request
from collections.abc import Callable
from typing import Any

from engine.prompt import build_prompt
from recommenders.base import Recommendation
from recommenders.grammar import gbnf_for
from recommenders.orchestrate import candidate_ids, extract_fields

Post = Callable[[str, dict[str, Any]], dict[str, Any]]


def http_post(url: str, body: dict[str, Any], timeout: float = 10) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read())


def _parse_id(payload: dict[str, Any]) -> str:
    content = payload.get("content")
    if content is None:
        choices = payload.get("choices") or [{}]
        message = choices[0].get("message") or choices[0]
        content = message.get("content") or message.get("text") or ""
    if isinstance(content, dict):
        return str(content.get("next_question_id") or "")
    try:
        parsed = json.loads(content)
    except (TypeError, json.JSONDecodeError):
        return ""
    if isinstance(parsed, dict):
        return str(parsed.get("next_question_id") or "")
    return ""


class LocalLLM:
    def __init__(
        self,
        library: Any,
        *,
        server: str = "http://127.0.0.1:8080",
        model_id: str = "Meta-Llama-3.1-8B-Instruct-Q4_K_M",
        post: Post | None = None,
    ) -> None:
        self.library = library
        self.server = server.rstrip("/")
        self.model_id = model_id
        self._post = post or http_post

    def next(self, state: Any, candidates: list[Any]) -> Recommendation:
        ids = candidate_ids(candidates)
        fields = (
            extract_fields(state, state.get("events") or [], candidates)
            if isinstance(state, dict)
            else {}
        )
        if isinstance(state, dict):
            for key in (
                "context_chips",
                "stated_purpose",
                "transcript",
                "evidence_ids",
                "leading_pattern",
                "candidates",
            ):
                if key in state:
                    fields[key] = state[key]
        if "candidates" not in fields:
            fields["candidates"] = candidates
        prompt = build_prompt(fields, self.library)
        body = {
            "prompt": prompt,
            "grammar": gbnf_for(ids),
            "temperature": 0,
            "n_predict": 32,
            "cache_prompt": True,
            "stream": False,
        }
        payload = self._post(f"{self.server}/completion", body)
        return Recommendation(next_question_id=_parse_id(payload), signals_asserted=[])
