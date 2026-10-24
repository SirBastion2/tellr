"""stdlib JSON POST for llama-server and hosted providers. No extra dependency."""

from __future__ import annotations

import json
import urllib.request


def post_json(
    url: str,
    body: dict,
    *,
    headers: dict[str, str] | None = None,
    timeout_s: float = 1.5,
) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        return json.loads(resp.read().decode())
