"""Stand-in engine that replays contract/fixtures (docs/ROSTER.md §5.1)."""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from copy import deepcopy
from pathlib import Path
from typing import Any

from engine import (
    Command,
    CommandRejected,
    Event,
    Library,
    QuestionId,
    SessionState,
    Stage,
    Stop,
)

_REPO_ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_FIXTURES = _REPO_ROOT / "contract" / "fixtures"


class ReplayError(LookupError):
    """No contract fixture matches this event prefix."""


class FakeEngine:
    """Replay T1–T7 so A2 can build the API before the real fold exists."""

    def __init__(self, fixtures_dir: Path | str | None = None) -> None:
        root = Path(fixtures_dir) if fixtures_dir is not None else _DEFAULT_FIXTURES
        self._cases: dict[str, dict[str, Any]] = {}
        for path in sorted(root.glob("T*.json")):
            payload = json.loads(path.read_text(encoding="utf-8"))
            self._cases[payload["case"]] = payload

    def cases(self) -> list[str]:
        return sorted(self._cases)

    def replay(self, case: str, step: int) -> SessionState:
        return deepcopy(self._cases[case]["steps"][step]["response"])

    def project(self, events: list[Event], lib: Library) -> SessionState:
        del lib
        actions = _actions_from_events(events)
        if not actions:
            raise ReplayError("no events to replay")
        matches: list[tuple[str, Mapping[str, Any]]] = []
        for case, payload in self._cases.items():
            steps = payload["steps"]
            if len(actions) > len(steps):
                continue
            prefix = [_action_from_request(step) for step in steps[: len(actions)]]
            if prefix == actions:
                matches.append((case, steps[len(actions) - 1]["response"]))
        if not matches:
            raise ReplayError(f"no fixture matches {actions!r}")
        exact = [item for item in matches if len(self._cases[item[0]]["steps"]) == len(actions)]
        chosen = (exact or sorted(matches, key=lambda item: item[0]))[0]
        return deepcopy(chosen[1])

    def candidates(self, state: SessionState, lib: Library) -> tuple[Stage, list[QuestionId]]:
        del lib
        question = state.get("question")
        if question is None:
            return "probe", []
        return question["stage"], [question["id"]]

    def stop(
        self, state: SessionState, lib: Library, cands: Sequence[QuestionId]
    ) -> Stop:
        del lib, cands
        stop = state.get("stop")
        return deepcopy(stop) if stop is not None else None

    def rule_choice(self, cands: Sequence[QuestionId]) -> QuestionId:
        if not cands:
            raise ValueError("rule_choice requires at least one candidate")
        return cands[0]

    def check_command(
        self, events: list[Event], command: Command, lib: Library
    ) -> None:
        kinds = [str(event.get("type")) for event in events]
        if "SessionClosed" in kinds:
            raise CommandRejected("session_closed", "session is closed")
        mode = command.get("mode")
        if mode is None:
            for event in events:
                if event.get("type") == "SessionOpened":
                    mode = event.get("mode")
                    break
        if command.get("scenario_id") and mode == "live":
            raise CommandRejected(
                "scenario_on_live_session", "live sessions cannot carry a scenario"
            )
        command_type = command.get("type")
        if command_type == "answer":
            question_id = command.get("question_id")
            question = next((item for item in lib.questions if item.id == question_id), None)
            is_opener = question is not None and (
                question.role == "opener" or question.records_purpose
            )
            if is_opener and not command.get("purpose"):
                raise CommandRejected(
                    "purpose_required_on_opener", "opener answer requires a purpose"
                )
            if question is not None and not is_opener and command.get("purpose"):
                raise CommandRejected(
                    "purpose_not_allowed", "purpose is only recorded on the opener"
                )
        if command_type == "outcome" and not command.get("actor"):
            raise CommandRejected("outcome_requires_actor", "outcome requires an actor")
        if command_type == "close" and "OutcomeRecorded" not in kinds:
            raise CommandRejected("close_without_outcome", "cannot close without an outcome")


def _action_from_request(step: Mapping[str, Any]) -> tuple[Any, ...]:
    endpoint = step["endpoint"]
    request = step["request"]
    if endpoint == "POST /sessions":
        return ("open", request.get("mode"), request.get("amount_band"))
    if endpoint.endswith("/context"):
        return ("context", frozenset(request.get("chips") or ()))
    if endpoint.endswith("/answers"):
        return (
            "answer",
            request.get("question_id"),
            request.get("chip"),
            request.get("purpose"),
        )
    raise ReplayError(f"unsupported fixture endpoint {endpoint}")


def _actions_from_events(events: Sequence[Event]) -> list[tuple[Any, ...]]:
    actions: list[tuple[Any, ...]] = []
    for event in events:
        kind = event.get("type")
        if kind == "SessionOpened":
            actions.append(("open", event.get("mode"), event.get("amount_band")))
        elif kind == "ContextAdded":
            actions.append(("context", frozenset(event.get("chips") or ())))
        elif kind == "AnswerRecorded":
            actions.append(
                (
                    "answer",
                    event.get("question_id"),
                    event.get("chip"),
                    event.get("purpose"),
                )
            )
    return actions
