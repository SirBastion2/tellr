"""Rule engine, asserts_on defaults, talk tracks, and command checks."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from engine.eligibility import eligible
from engine.hypotheses import displayed
from engine.library import Library, Question
from engine.score import level, score, shown, tables_from_library
from engine.stop import stop_check

QuestionId = str
Command = Mapping[str, Any]
Event = Mapping[str, Any]

_OPEN_GAP = {"vague": ["sig.specificity_gap"], "no_answer": ["sig.specificity_gap"]}
_SOURCE = {"opener": "fixed", "verify": "rules", "probe": "rules"}
_LEVEL_WIRE = {"Clear": "clear", "Caution": "caution", "High concern": "high"}
_STAGE_TT = {"clear": "tt.proceed", "caution": "tt.slow_down", "high": "tt.escalate"}
_STORY_FAIL = frozenset({"sig.specificity_gap", "sig.story_drift"})


def signals_for(question_id: str | None, chip: str | None, lib: Library) -> list[str]:
    """§5.6, §7.3: asserts_on is authoritative; chip defaults apply only where it is silent."""
    if not question_id or not chip:
        return []
    question = next((item for item in lib.questions if item.id == question_id), None)
    if question is None:
        return []
    asserts = question.asserts_on or {}
    if chip in asserts:
        return list(asserts[chip])
    defaults = {
        "changed": ["sig.story_drift"],
        "relayed_by_caller": ["sig.answer_relayed"],
    }
    if question.kind == "open":
        defaults.update(_OPEN_GAP)
    return list(defaults.get(chip, []))


def rule_choice(cands: Sequence[QuestionId]) -> QuestionId:
    """§7.3: the rule engine picks the top-ranked candidate."""
    if not cands:
        raise ValueError("rule_choice requires at least one candidate")
    return cands[0]


def question_view(question_id: str, stage: str, lib: Library) -> dict[str, Any]:
    question = next((item for item in lib.questions if item.id == question_id), None)
    if question is None:
        return {
            "id": question_id,
            "text": question_id,
            "why": "",
            "kind": "open",
            "chips": ["specific", "vague", "no_answer", "changed", "relayed_by_caller"],
            "stage": stage,
            "source": _SOURCE.get(stage, "rules"),
        }
    return {
        "id": question.id,
        "text": question.text,
        "why": question.why,
        "kind": question.kind,
        "chips": list(question.chips),
        "stage": stage,
        "source": _SOURCE.get(stage, "rules"),
    }


def talk_track_for(shown_lvl: str, pattern: Mapping[str, Any] | None, lib: Library) -> dict[str, Any]:
    """§7.1: stage lines from the suggested outcome; pattern lines only while displayed."""
    wire = _LEVEL_WIRE.get(shown_lvl, shown_lvl)
    stage_id = _STAGE_TT[wire]
    tracks = {item.id: item for item in lib.talk_tracks}
    stage = tracks[stage_id]
    pat_id = None
    extra: list[str] = []
    if pattern and pattern.get("kind") == "pattern":
        ident = str(pattern["id"])
        spec = next((item for item in lib.patterns if item.id == ident), None)
        candidate = spec.talk_track if spec and spec.talk_track else "tt." + ident.split(".", 1)[-1]
        if candidate in tracks:
            pat_id = candidate
            extra = list(tracks[candidate].lines)
    return {
        "stage": stage_id,
        "pattern": pat_id,
        "lines": list(stage.lines) + extra,
        "avoid": list(stage.avoid),
    }


def public_state(state: Mapping[str, Any]) -> dict[str, Any]:
    """SessionState without the fold bag. A2 should strip `_engine` before HTTP."""
    return {key: value for key, value in state.items() if key != "_engine"}


def _is_opener(question: Question | None) -> bool:
    return question is not None and (question.role == "opener" or question.records_purpose)


def check_command(events: list[Event], command: Command, lib: Library) -> None:
    """Raise CommandRejected(code) for the six CHANGE-002 invariants."""
    from engine import CommandRejected

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
    if command_type in ("answer", "AnswerRecorded"):
        question_id = command.get("question_id")
        question = next((item for item in lib.questions if item.id == question_id), None)
        is_opener = _is_opener(question)
        if is_opener and not command.get("purpose"):
            raise CommandRejected(
                "purpose_required_on_opener", "opener answer requires a purpose"
            )
        if question is not None and not is_opener and command.get("purpose"):
            raise CommandRejected(
                "purpose_not_allowed", "purpose is only recorded on the opener"
            )
    if command_type in ("outcome", "OutcomeRecorded") and not command.get("actor"):
        raise CommandRejected("outcome_requires_actor", "outcome requires an actor")
    if command_type in ("close", "SessionClosed") and "OutcomeRecorded" not in kinds:
        raise CommandRejected("close_without_outcome", "cannot close without an outcome")


def _snap(st: dict[str, Any]) -> dict[str, Any]:
    return {
        "asked": list(st["asked"]),
        "evidence": list(st["evidence"]),
        "purpose": st["purpose"],
        "story_failed": st["story_failed"],
    }


def _question(lib: Library, question_id: str) -> Question:
    return next(item for item in lib.questions if item.id == question_id)


class RuleEngine:
    """Rules-only recommender and the T1–T7 oracle loop (architecture §7.3)."""

    def __init__(self, lib: Library) -> None:
        self.lib = lib
        self.tables = tables_from_library(lib)

    def run_case(
        self,
        context: Sequence[str],
        purpose: str,
        answers: Mapping[str, str],
        default: str = "vague",
        probes: bool = True,
    ) -> list[dict[str, Any]]:
        """Same row shape as reference_impl.run_case."""
        tables = self.tables
        st: dict[str, Any] = {
            "asked": [],
            "evidence": list(context),
            "purpose": None,
            "story_failed": False,
        }
        raw_score = score(st["evidence"], tables)
        prev = level(raw_score, tables)
        rows = [
            {
                "step": "context",
                "qid": None,
                "chip": None,
                "stage": "",
                "score": raw_score,
                "raw": prev,
                "shown": prev,
                "display": displayed(st["evidence"], prev, tables),
                "stop": None,
                "state": _snap(st),
            }
        ]
        for n in range(1, 8):
            stage, cands = eligible(st, self.lib, tables)
            if not cands:
                rows[-1]["stop"] = rows[-1]["stop"] or ("hard", "nothing left to ask")
                break
            qid = cands[0]
            question = _question(self.lib, qid)
            chip = answers.get(question.intent, default)
            if question.role == "opener":
                st["purpose"] = purpose
            sigs = signals_for(qid, chip, self.lib)
            st["asked"].append(qid)
            st["evidence"] += sigs
            if question.role == "verify" and _STORY_FAIL & set(sigs):
                st["story_failed"] = True
            raw_score = score(st["evidence"], tables)
            raw = level(raw_score, tables)
            sh = shown(prev, raw_score, tables)
            rec = stop_check(st, n, context, self.lib, tables, probes)
            if rec:
                sh = raw
            rows.append(
                {
                    "step": f"Q{n}",
                    "qid": qid,
                    "chip": chip,
                    "stage": stage,
                    "score": raw_score,
                    "raw": raw,
                    "shown": sh,
                    "display": displayed(st["evidence"], sh, tables),
                    "stop": rec,
                    "state": _snap(st),
                }
            )
            prev = sh
            if rec:
                break
        return rows
