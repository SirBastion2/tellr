"""HostedLLM: provider API, structured IDs only; same validator as LocalLLM (§10.3)."""

from __future__ import annotations

import json
import os
import urllib.request
from collections.abc import Callable
from typing import Any

from engine.prompt import build_prompt
from recommenders.base import Recommendation
from recommenders.local_llm import _parse_id
from recommenders.orchestrate import extract_fields

Post = Callable[[str, dict[str, Any]], dict[str, Any]]


def http_post(
    url: str, body: dict[str, Any], timeout: float = 10, api_key: str | None = None
) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    request = urllib.request.Request(
        url, data=json.dumps(body).encode(), headers=headers
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read())


class HostedLLM:
    def __init__(
        self,
        library: Any,
        *,
        url: str = "",
        model_id: str = "hosted",
        api_key: str | None = None,
        post: Post | None = None,
    ) -> None:
        self.library = library
        self.url = (url or os.environ.get("HOSTED_LLM_URL") or "").rstrip("/")
        self.model_id = model_id
        self.api_key = api_key or os.environ.get("HOSTED_LLM_API_KEY")
        self._post = post

    def next(self, state: Any, candidates: list[Any]) -> Recommendation:
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
            "model": self.model_id,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": "Select one question ID. Reply with JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
        }
        post = self._post or (
            lambda url, payload: http_post(url, payload, api_key=self.api_key)
        )
        endpoint = self.url
        if endpoint and not endpoint.endswith("/chat/completions"):
            endpoint = f"{endpoint}/chat/completions"
        payload = post(endpoint, body)
        return Recommendation(next_question_id=_parse_id(payload), signals_asserted=[])
