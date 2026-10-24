"""Library models and boot validation (architecture §5, §15)."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

import yaml
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)

_KNOWN_KEYS = frozenset(
    {
        "library_version",
        "copy_status",
        "patterns",
        "purposes",
        "questions",
        "signals",
        "chips",
        "context_chips",
        "talk_tracks",
    }
)


class LibraryBootError(ValueError):
    """The library failed boot validation (architecture §5.1)."""


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LookAlike(_Strict):
    id: str
    label: str | None = None
    description: str = ""
    confirmed_by: list[str] = Field(default_factory=list)
    refuted_by: list[str] = Field(default_factory=list)
    verifying_questions: list[str] = Field(default_factory=list)


class Pattern(_Strict):
    id: str
    name: str
    label: str | None = None
    cover_story: str = ""
    enabled: bool = True
    signals: list[str] = Field(default_factory=list)
    talk_track: str | None = None
    look_alikes: list[LookAlike] = Field(default_factory=list)
    review: str | None = None


class Purpose(_Strict):
    id: str
    label: str
    routes_to: str | None = None
    verifies: str | None = None


class Question(_Strict):
    id: str
    intent: str
    text: str
    why: str
    kind: Literal["open", "yes_no"]
    role: Literal["opener", "verify", "probe"]
    pattern: str | None = None
    tests: list[str] = Field(default_factory=list)
    chips: list[str]
    asserts_on: dict[str, list[str]] | None = None
    generic: bool = False
    fixed_opener: bool = False
    records_purpose: bool = False

    @model_validator(mode="after")
    def yes_no_declares_asserts_on(self) -> Question:
        if self.kind == "yes_no" and not self.asserts_on:
            raise ValueError("yes/no question must declare asserts_on")
        return self


class Signal(_Strict):
    id: str
    name: str
    family: str
    weight: int
    requires_interview: bool
    rationale: str

    @field_validator("rationale")
    @classmethod
    def rationale_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("signal rationale is required")
        return value


class AnswerChip(_Strict):
    id: str
    label: str
    used_on: Literal["open", "yes_no", "any"]


class ContextChip(_Strict):
    id: str
    label: str
    signal: str | None = None
    probe: str | None = None


class TalkTrack(_Strict):
    id: str
    lines: list[str]
    avoid: list[str] = Field(default_factory=list)


class Library(_Strict):
    library_version: str
    copy_status: str
    patterns: list[Pattern]
    purposes: list[Purpose]
    questions: list[Question]
    signals: list[Signal]
    chips: list[AnswerChip]
    context_chips: list[ContextChip]
    talk_tracks: list[TalkTrack]

    @property
    def look_alikes(self) -> list[tuple[str, LookAlike]]:
        return [(pattern.id, look) for pattern in self.patterns for look in pattern.look_alikes]


def load_library(path: Path | str) -> Library:
    """Load `library/*.yaml` and refuse to boot when references or required fields are wrong."""
    root = Path(path)
    if not root.is_dir():
        raise LibraryBootError(f"library path is not a directory: {root}")
    merged: dict[str, object] = {}
    for yaml_path in sorted(root.glob("*.yaml")):
        loaded = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
        if not isinstance(loaded, dict):
            raise LibraryBootError(f"{yaml_path.name}: expected a mapping")
        unknown = set(loaded) - _KNOWN_KEYS
        if unknown:
            raise LibraryBootError(f"{yaml_path.name}: unknown keys {sorted(unknown)}")
        for key, value in loaded.items():
            if key in merged:
                raise LibraryBootError(f"duplicate library key {key!r} in {yaml_path.name}")
            merged[key] = value
    try:
        library = Library.model_validate(merged)
    except ValidationError as exc:
        raise _from_validation(exc) from exc
    _check_unique_ids(library)
    _check_references(library)
    return library


def export_library(library: Library) -> dict[str, object]:
    """GET /library UI projection (Q-007). Display labels, not fold facts."""
    return {
        "library_version": library.library_version,
        "copy_status": library.copy_status,
        "chips": [
            {"id": chip.id, "label": chip.label, "used_on": chip.used_on}
            for chip in library.chips
        ],
        "purposes": [
            {"id": purpose.id, "label": purpose.label} for purpose in library.purposes
        ],
        "context_chips": [
            {
                "id": chip.id,
                "label": chip.label,
                "signal": chip.signal,
                "probe": chip.probe,
            }
            for chip in library.context_chips
        ],
        "questions": [
            {
                "id": question.id,
                "intent": question.intent,
                "kind": question.kind,
                "role": question.role,
                "text": question.text,
                "why": question.why,
                "chips": list(question.chips),
            }
            for question in library.questions
        ],
        "signals": [
            {
                "id": signal.id,
                "label": signal.name,
                "rationale": signal.rationale,
                "direction": "mitigating" if signal.weight < 0 else "concern",
            }
            for signal in library.signals
        ],
        "patterns": [
            {"id": pattern.id, "label": pattern.label or pattern.name}
            for pattern in library.patterns
        ],
        "look_alikes": [
            {
                "id": look.id,
                "label": look.label or look.id.removeprefix("look.").replace("_", " "),
                "pattern": pattern_id,
            }
            for pattern_id, look in library.look_alikes
        ],
        "talk_tracks": [
            {"id": track.id, "lines": list(track.lines), "avoid": list(track.avoid)}
            for track in library.talk_tracks
        ],
    }


def _from_validation(exc: ValidationError) -> LibraryBootError:
    parts: list[str] = []
    for err in exc.errors():
        loc = ".".join(str(item) for item in err["loc"])
        parts.append(f"{loc}: {err['msg']}")
    return LibraryBootError("; ".join(parts) or str(exc))


def _check_unique_ids(library: Library) -> None:
    groups = {
        "pattern": [p.id for p in library.patterns],
        "look-alike": [look.id for _, look in library.look_alikes],
        "purpose": [p.id for p in library.purposes],
        "question": [q.id for q in library.questions],
        "signal": [s.id for s in library.signals],
        "chip": [c.id for c in library.chips],
        "context chip": [c.id for c in library.context_chips],
        "talk track": [t.id for t in library.talk_tracks],
    }
    for kind, ids in groups.items():
        dupes = sorted({item for item in ids if ids.count(item) > 1})
        if dupes:
            raise LibraryBootError(f"duplicate {kind} IDs: {dupes}")


def _check_references(library: Library) -> None:
    signals = {item.id for item in library.signals}
    questions = {item.id for item in library.questions}
    patterns = {item.id for item in library.patterns}
    looks = {look.id for _, look in library.look_alikes}
    chips = {item.id for item in library.chips}
    tracks = {item.id for item in library.talk_tracks}
    hypotheses = patterns | looks
    missing: list[str] = []

    def need(identifier: str | None, pool: set[str], kind: str) -> None:
        if identifier is not None and identifier not in pool:
            missing.append(f"{kind}:{identifier}")

    for pattern in library.patterns:
        for signal_id in pattern.signals:
            need(signal_id, signals, "signal")
        need(pattern.talk_track, tracks, "talk_track")
        for look in pattern.look_alikes:
            for signal_id in look.confirmed_by + look.refuted_by:
                need(signal_id, signals, "signal")
            for question_id in look.verifying_questions:
                need(question_id, questions, "question")
    for purpose in library.purposes:
        need(purpose.routes_to, patterns, "pattern")
        need(purpose.verifies, looks, "look_alike")
    chip_use = {chip.id: chip.used_on for chip in library.chips}
    for question in library.questions:
        need(question.pattern, patterns, "pattern")
        for hypothesis in question.tests:
            need(hypothesis, hypotheses, "hypothesis")
        for chip_id in question.chips:
            need(chip_id, chips, "chip")
            used_on = chip_use.get(chip_id)
            if used_on and used_on not in ("any", question.kind):
                missing.append(f"chip-use:{question.id}:{chip_id}")
        for asserted in (question.asserts_on or {}).values():
            for signal_id in asserted:
                need(signal_id, signals, "signal")
    for chip in library.context_chips:
        need(chip.signal, signals, "signal")
        need(chip.probe, questions, "question")
    if missing:
        raise LibraryBootError("unresolved IDs: " + ", ".join(missing))
