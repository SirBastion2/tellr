"""Client-local hour from an offset timestamp or IANA timezone."""

from __future__ import annotations

from datetime import UTC, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

_NAIVE_MSG = "cannot derive local hour from naive UTC"


def parse_instant(ts: str) -> datetime:
    return datetime.fromisoformat(ts.strip().replace("Z", "+00:00"))


def iso_now(timezone: str | None = None) -> str:
    """Aware ISO-8601. Never datetime.utcnow() / naive UTC."""
    if timezone:
        return datetime.now(ZoneInfo(timezone)).isoformat(timespec="seconds")
    return datetime.now(UTC).isoformat(timespec="seconds")


def local_hour(ts: str, timezone: str | None = None) -> int:
    """Local hour 0–23 from an offset/Z timestamp, or UTC + IANA zone."""
    dt = parse_instant(ts)
    if timezone:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.astimezone(ZoneInfo(timezone)).hour
    if dt.tzinfo is None:
        raise ValueError(_NAIVE_MSG)
    return dt.hour


def resolve_session_time(opened_at: str | None, timezone: str | None) -> str:
    """Prefer the client's offset timestamp; otherwise now in that zone or UTC."""
    if opened_at:
        dt = parse_instant(opened_at)
        if timezone:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            return dt.astimezone(ZoneInfo(timezone)).isoformat(timespec="seconds")
        if dt.tzinfo is None:
            raise ValueError(_NAIVE_MSG)
        return dt.isoformat(timespec="seconds")
    return iso_now(timezone)


__all__ = [
    "ZoneInfoNotFoundError",
    "iso_now",
    "local_hour",
    "parse_instant",
    "resolve_session_time",
]
