"""Process-wide recommender stats for GET /health (architecture §16)."""

from __future__ import annotations


def _percentile(samples: list[int], pct: float) -> float | None:
    if not samples:
        return None
    ordered = sorted(samples)
    if len(ordered) == 1:
        return float(ordered[0])
    rank = (len(ordered) - 1) * pct / 100
    low = int(rank)
    high = min(low + 1, len(ordered) - 1)
    return ordered[low] + (ordered[high] - ordered[low]) * (rank - low)


class Metrics:
    def __init__(self) -> None:
        self.latencies_ms: list[int] = []
        self.attempts = 0
        self.fallbacks = 0
        self.rejections = 0
        self.agreements = 0
        self.compared = 0

    def record_attempt(
        self,
        *,
        latency_ms: int,
        fallback: bool,
        rejected: bool,
        agreed: bool | None,
    ) -> None:
        self.attempts += 1
        self.latencies_ms.append(max(0, int(latency_ms)))
        if fallback:
            self.fallbacks += 1
        if rejected:
            self.rejections += 1
        if agreed is not None:
            self.compared += 1
            if agreed:
                self.agreements += 1

    def snapshot(self) -> dict[str, float | int | None]:
        return {
            "p50": _percentile(self.latencies_ms, 50),
            "p95": _percentile(self.latencies_ms, 95),
            "fallback_rate": (self.fallbacks / self.attempts) if self.attempts else 0.0,
            "rejection_count": self.rejections,
            "agreement_rate": (
                self.agreements / self.compared if self.compared else None
            ),
        }
