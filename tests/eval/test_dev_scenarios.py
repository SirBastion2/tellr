"""First 15 development scenarios: seeds, mix, and validation (ROSTER §5.2)."""

from __future__ import annotations

from pathlib import Path

import yaml

SEED_IDS = {
    "T1": "scn.legitimate.t1_contractor_on_phone",
    "T2": "scn.coached.t2_bank_safe_account",
    "T3": "scn.coached.t3_renovation_cover",
    "T4": "scn.legitimate.t4_contractor_forgot_name",
    "T5": "scn.legitimate.t5_own_account_transfer",
    "T6": "scn.coached.t6_perfect_contractor",
    "T7": "scn.legitimate.t7_cash_only_contractor",
}

PURPOSE_PATTERN = {
    "purpose.home_repair": "pat.home_repair",
    "purpose.moving_money": "pat.bank_impersonation",
    "purpose.government_payment": "pat.government_impersonation",
    "purpose.family_help": "pat.family_emergency",
    "purpose.computer_or_refund": "pat.tech_support",
}

INNOCENT_RED_FLAGS = {
    "chip.on_phone",
    "chip.someone_directing",
    "chip.cash_only",
    "chip.urgency_secrecy",
    "chip.rushed",
    "chip.unusual_for_customer",
}


def _load_dev(dev_dir: Path) -> list[tuple[Path, dict]]:
    files = sorted(dev_dir.glob("*.yaml"))
    loaded: list[tuple[Path, dict]] = []
    for path in files:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            loaded.extend((path, item) for item in data)
        else:
            loaded.append((path, data))
    return loaded


def test_exactly_fifteen_dev_scenarios(dev_dir: Path) -> None:
    loaded = _load_dev(dev_dir)
    assert len(loaded) == 15, f"hours 2–6 slice is 15 scenarios, found {len(loaded)}"


def test_dev_scenarios_validate(dev_dir: Path, library_path: Path) -> None:
    from eval.validate import validate_path

    loaded = _load_dev(dev_dir)
    assert loaded, "eval/scenarios/dev/ has no YAML yet"
    errors: list[str] = []
    for path, _ in loaded:
        errors.extend(f"{path.name}: {e}" for e in validate_path(path, library_path))
    assert errors == []


def test_seven_reference_seeds_present(dev_dir: Path) -> None:
    ids = {item["id"] for _, item in _load_dev(dev_dir)}
    missing = [case for case, sid in SEED_IDS.items() if sid not in ids]
    assert missing == [], f"missing reference seeds: {missing}"
    by_id = {item["id"]: item for _, item in _load_dev(dev_dir)}
    for case, sid in SEED_IDS.items():
        tags = by_id[sid].get("tags", [])
        assert f"seed.{case}" in tags, f"{sid} should be tagged seed.{case}"


def test_ids_are_unique(dev_dir: Path) -> None:
    ids = [item["id"] for _, item in _load_dev(dev_dir)]
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    assert dupes == []


def test_partial_mix_toward_roster_5_2(dev_dir: Path) -> None:
    items = [item for _, item in _load_dev(dev_dir)]
    coached = [s for s in items if s["population"] == "coached"]
    legitimate = [s for s in items if s["population"] == "legitimate"]
    assert len(coached) + len(legitimate) == len(items)
    assert len(coached) >= 7
    assert len(legitimate) >= 7

    covers = [s for s in coached if "cover_story" in s.get("tags", [])]
    perfect = [s for s in coached if "perfectly_coached" in s.get("tags", [])]
    red = [s for s in legitimate if "innocent_red_flag" in s.get("tags", [])]
    vague = [s for s in legitimate if "vague_but_genuine" in s.get("tags", [])]
    assert len(covers) >= 4
    assert len(perfect) >= 3
    assert len(red) >= 4
    assert len(vague) >= 3


def test_cover_story_tags_match_purpose_vs_truth(dev_dir: Path) -> None:
    for path, item in _load_dev(dev_dir):
        if item["population"] != "coached":
            continue
        implied = PURPOSE_PATTERN.get(item["stated_purpose"])
        is_cover = implied != item["pattern_truth"]
        tagged = "cover_story" in item.get("tags", [])
        assert tagged == is_cover, (
            f"{path.name}: cover_story tag {tagged} but purpose "
            f"{item['stated_purpose']} vs truth {item['pattern_truth']}"
        )


def test_innocent_red_flag_tags_match_context(dev_dir: Path) -> None:
    for path, item in _load_dev(dev_dir):
        if item["population"] != "legitimate":
            continue
        has_flag = bool(INNOCENT_RED_FLAGS.intersection(item.get("context_chips") or []))
        tagged = "innocent_red_flag" in item.get("tags", [])
        assert tagged == has_flag, f"{path.name}: innocent_red_flag tag {tagged}"


def test_vague_but_genuine_has_a_vague_answer(dev_dir: Path) -> None:
    for path, item in _load_dev(dev_dir):
        if "vague_but_genuine" not in item.get("tags", []):
            continue
        assert item["population"] == "legitimate", path.name
        assert "vague" in item["answers"].values(), f"{path.name} has no vague chip"


def test_no_heldout_scenarios_in_this_slice(repo_root: Path) -> None:
    heldout = repo_root / "eval" / "scenarios" / "heldout"
    if not heldout.exists():
        return
    yamls = list(heldout.glob("*.yaml")) + list(heldout.glob("*.yml"))
    assert yamls == [], "A3 must not write eval/scenarios/heldout/"
