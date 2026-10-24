"""engine-api-v1 (docs/ROSTER.md §5.1). Signatures are frozen."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal

from engine.eligibility import candidates
from engine.library import Library, LibraryBootError, export_library, load_library
from engine.reduce import project
from engine.rules import RuleEngine, check_command, public_state, rule_choice
from engine.stop import stop

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


__all__ = [
    "Command",
    "CommandRejected",
    "Event",
    "Library",
    "LibraryBootError",
    "QuestionId",
    "RuleEngine",
    "SessionState",
    "Stage",
    "Stop",
    "candidates",
    "check_command",
    "export_library",
    "load_library",
    "project",
    "public_state",
    "rule_choice",
    "stop",
]
