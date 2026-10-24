#!/usr/bin/env python3
"""Contract check (WORKFLOW.md §5, §8). No third-party dependencies.

1. library.json and every fixture step validate against the schemas.
2. Cross-field rules the schema can't express.
3. Fixtures are current: regenerating from reference_impl.py gives identical JSON.
4. Oracles are intact: hashes in contract/oracle.sha256 match.

    python3 scripts/check_contract.py           # check
    python3 scripts/check_contract.py --rehash  # Agent R only, after an approved CHANGE
"""
import hashlib, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
import tempfile
# Never trust cached bytecode of the oracle: Python validates .pyc files by mtime in whole seconds
# plus size, so a same-size edit within one second would otherwise be checked against stale code.
sys.dont_write_bytecode = True
sys.pycache_prefix = tempfile.mkdtemp(prefix="tc-")
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
ORACLES = ["reference_impl.py", "docs/architecture.md", "tests/golden/reference_weights.yaml",
           "contract/session_state.schema.json", "contract/library.schema.json"]
errors = []


def err(msg):
    errors.append(msg)


def is_type(v, t):
    if t == "integer":
        return isinstance(v, int) and not isinstance(v, bool)
    if t == "number":
        return isinstance(v, (int, float)) and not isinstance(v, bool)
    return isinstance(v, {"object": dict, "array": list, "string": str, "boolean": bool}[t])


def validate(v, s, path):
    t = s.get("type")
    if t is not None:
        types = t if isinstance(t, list) else [t]
        if v is None:
            if "null" not in types:
                err(f"{path}: null not allowed")
            return
        if not any(is_type(v, x) for x in types if x != "null"):
            err(f"{path}: expected {types}, got {type(v).__name__}")
            return
    if "enum" in s and v not in s["enum"]:
        err(f"{path}: {v!r} not in {s['enum']}")
    if "const" in s and v != s["const"]:
        err(f"{path}: must equal {s['const']}")
    if isinstance(v, dict):
        for k in s.get("required", []):
            if k not in v:
                err(f"{path}: missing '{k}'")
        props = s.get("properties", {})
        if s.get("additionalProperties") is False:
            for k in v:
                if k not in props:
                    err(f"{path}: unexpected '{k}'")
        for k, sub in props.items():
            if k in v:
                validate(v[k], sub, f"{path}.{k}")
    if isinstance(v, list):
        if len(v) < s.get("minItems", 0):
            err(f"{path}: fewer than {s['minItems']} items")
        if "maxItems" in s and len(v) > s["maxItems"]:
            err(f"{path}: more than {s['maxItems']} items")
        for i, x in enumerate(v):
            if "items" in s:
                validate(x, s["items"], f"{path}[{i}]")
    if is_type(v, "number") and not isinstance(v, bool):
        if "minimum" in s and v < s["minimum"]:
            err(f"{path}: below {s['minimum']}")
        if "maximum" in s and v > s["maximum"]:
            err(f"{path}: above {s['maximum']}")


def sha(p):
    return hashlib.sha256((ROOT / p).read_bytes()).hexdigest()


def load(p):
    return json.loads((ROOT / p).read_text())


def main():
    if "--rehash" in sys.argv:
        (ROOT / "contract/oracle.sha256").write_text("".join(f"{sha(p)}  {p}\n" for p in ORACLES))
        print("contract/oracle.sha256 rewritten. Commit it with the approved CHANGE.")
        return 0

    sess_schema = load("contract/session_state.schema.json")
    lib_schema = load("contract/library.schema.json")
    lib = load("contract/library.json")
    validate(lib, lib_schema, "library")

    chip_use = {c["id"]: c["used_on"] for c in lib["chips"]}
    qs = {q["id"]: q for q in lib["questions"]}
    sigs = {s["id"]: s for s in lib["signals"]}
    purposes = {p["id"] for p in lib["purposes"]}
    pats = {p["id"] for p in lib["patterns"]} | {l["id"] for l in lib["look_alikes"]}
    tracks = {t["id"] for t in lib["talk_tracks"]}
    for q in qs.values():
        bad = [c for c in q["chips"] if chip_use[c] not in ("any", q["kind"])]
        if bad:
            err(f"library question {q['id']}: chips {bad} not usable on {q['kind']} questions")

    suggest = {"clear": "proceed", "caution": "slow_down", "high": "escalate"}
    fixture_files = sorted((ROOT / "contract/fixtures").glob("T*.json"))
    if not fixture_files:
        err("no fixtures in contract/fixtures/")
    steps = 0
    for f in fixture_files:
        fx = json.loads(f.read_text())
        answered = 0
        for i, step in enumerate(fx["steps"]):
            steps += 1
            where = f"{f.name} step {i}"
            st = step["response"]
            validate(st, sess_schema, where)
            if step["endpoint"].endswith("/answers"):
                answered += 1
            if st["answers"] != answered:
                err(f"{where}: answers={st['answers']} but {answered} answers were posted")
            q, stop, risk = st["question"], st["stop"], st["risk"]
            if q is not None:
                if q["id"] not in qs:
                    err(f"{where}: unknown question {q['id']}")
                elif q["chips"] != qs[q["id"]]["chips"]:
                    err(f"{where}: chips differ from the library's for {q['id']}")
            if (q is None) != (stop is not None and stop["kind"] == "hard"):
                err(f"{where}: question must be null exactly when the stop is hard (CHANGE-000)")
            last = i == len(fx["steps"]) - 1
            if (stop is not None) != last:
                err(f"{where}: a stop must appear on, and only on, the last step")
            want = "mitigating" if risk["level"] == "clear" else "concern"
            for r in risk["reasons"]:
                if r["id"] not in sigs or sigs[r["id"]]["direction"] != want:
                    err(f"{where}: reason {r['id']} points against the {risk['level']} level")
            cp = risk["counterpoint"]
            if cp and (cp["id"] not in sigs or sigs[cp["id"]]["direction"] == want):
                err(f"{where}: counterpoint {cp['id']} must point the opposite way")
            if risk["pattern"] and risk["pattern"]["id"] not in pats:
                err(f"{where}: unknown pattern {risk['pattern']['id']}")
            if st["suggested_outcome"] != suggest[risk["level"]]:
                err(f"{where}: suggested_outcome doesn't follow the shown level")
            if st["stated_purpose"] is not None and st["stated_purpose"] not in purposes:
                err(f"{where}: unknown purpose {st['stated_purpose']}")
            tt = st["talk_track"]
            for t in [tt["stage"]] + ([tt["pattern"]] if tt["pattern"] else []):
                if t not in tracks:
                    err(f"{where}: unknown talk track {t}")

    try:
        import gen_fixtures
        fresh_lib, fresh_fx = gen_fixtures.build()
        if fresh_lib != lib:
            err("contract/library.json is stale: run python3 scripts/gen_fixtures.py")
        for case, data in fresh_fx.items():
            p = ROOT / "contract/fixtures" / f"{case}.json"
            if not p.exists() or json.loads(p.read_text()) != data:
                err(f"contract/fixtures/{case}.json is stale or hand-edited: run python3 scripts/gen_fixtures.py")
    except Exception as e:  # noqa: BLE001
        err(f"could not regenerate fixtures from reference_impl.py: {e!r}")

    import reference_impl as R
    text = "\n".join(l for l in (ROOT / "tests/golden/reference_weights.yaml").read_text().splitlines()
                     if not l.lstrip().startswith("#"))
    ref = json.loads(text)
    if {k: list(v) for k, v in R.W.items()} != {k: list(v) for k, v in ref["weights"].items()} or ref["caps"] != R.CAPS:
        err("tests/golden/reference_weights.yaml disagrees with reference_impl.py")

    pinned = {}
    for line in (ROOT / "contract/oracle.sha256").read_text().splitlines():
        h, p = line.split(None, 1)
        pinned[p.strip()] = h
    for p in ORACLES:
        if pinned.get(p) != sha(p):
            err(f"{p} changed outside the change protocol (WORKFLOW.md §5)")

    if errors:
        print(f"CONTRACT CHECK FAILED ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")
        return 1
    print(f"contract OK: library + {len(fixture_files)} fixtures ({steps} steps) valid and current; oracles intact")
    return 0


if __name__ == "__main__":
    sys.exit(main())
