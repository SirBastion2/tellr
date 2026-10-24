"""Process-wide /health counters (architecture §16)."""

from __future__ import annotations

from typing import Any


def percentile(samples: list[float], p: float) -> float | None:
    if not samples:
        return None
    ordered = sorted(samples)
    rank = (len(ordered) - 1) * p / 100
    low = int(rank)
    high = min(low + 1, len(ordered) - 1)
    value = ordered[low] + (ordered[high] - ordered[low]) * (rank - low)
    return round(value, 1)


class Metrics:
    def __init__(self) -> None:
        self.latencies: list[float] = []
        self.attempts = 0
        self.fallbacks = 0
        self.rejections = 0
        self.agreements = 0
        self.valid_picks = 0

    def record(self, choice: Any) -> None:
        self.attempts += 1
        self.latencies.append(float(choice.latency_ms))
        if choice.fallback:
            self.fallbacks += 1
        if choice.rejected:
            self.rejections += 1
        if choice.source == "model":
            self.valid_picks += 1
            if choice.agreed:
                self.agreements += 1

    def snapshot(self) -> dict[str, Any]:
        p95 = percentile(self.latencies, 95)
        return {
            "p50": percentile(self.latencies, 50),
            "p95": p95,
            "last_p95": p95,
            "fallback_rate": (self.fallbacks / self.attempts) if self.attempts else 0.0,
            "rejection_count": self.rejections,
            "agreement_rate": (
                self.agreements / self.valid_picks if self.valid_picks else None
            ),
        }
