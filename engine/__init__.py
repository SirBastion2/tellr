"""engine-api-v1 (docs/ROSTER.md §5.1). Signatures are frozen."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any, Literal

from engine.library import Library, LibraryBootError, export_library, load_library
from engine.reduce import project

QuestionId = str
Stage = Literal["opener", "verify", "probe"]
Event = Mapping[str, Any]
SessionState = Mapping[str, Any]
Stop = Mapping[str, Any] | None
Command = Mapping[str, Any]


class CommandRejected(Exception):
    """Command handler rejected the command. `code` is a CHANGE-002 enum member."""

    def __init__(self, code: str, message: str = "") -> None:
        self.code = code
        self.message = message
        super().__init__(f"{code}: {message}" if message else code)


def candidates(state: SessionState, lib: Library) -> tuple[Stage, list[QuestionId]]:
    """§7.2: eligibility. Implemented in A-04."""
    raise NotImplementedError("engine.candidates lands in A-04")


def stop(
    state: SessionState, lib: Library, cands: Sequence[QuestionId]
) -> Stop:
    """§8.4 + CHANGE-000 precedence. Implemented in A-04."""
    raise NotImplementedError("engine.stop lands in A-04")


def rule_choice(cands: Sequence[QuestionId]) -> QuestionId:
    """§7.3: rule-engine pick. Implemented in A-04."""
    raise NotImplementedError("engine.rule_choice lands in A-04")


def check_command(events: list[Event], command: Command, lib: Library) -> None:
    """Raise CommandRejected(code) when the command is illegal. Implemented in A-04."""
    raise NotImplementedError("engine.check_command lands in A-04")


__all__ = [
    "Command",
    "CommandRejected",
    "Event",
    "Library",
    "LibraryBootError",
    "QuestionId",
    "SessionState",
    "Stage",
    "Stop",
    "candidates",
    "check_command",
    "export_library",
    "load_library",
    "project",
    "rule_choice",
    "stop",
]
