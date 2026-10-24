#!/usr/bin/env bash
# Quality gates (WORKFLOW.md §8).  Usage: scripts/gate.sh a | b | contract
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
fail() { echo "GATE FAIL: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "'$1' not found. $2"; }
step() { echo; echo "── $*"; }
contract() { step "contract"; python3 scripts/check_contract.py; }

case "${1:-}" in
  a)
    need python3 "Install Python 3.12."
    need ruff "pip install ruff"
    need pytest "pip install pytest"
    dirs=(); for d in engine recommenders api store eval tests; do [ -d "$d" ] && dirs+=("$d"); done
    [ ${#dirs[@]} -gt 0 ] || fail "no backend code yet."
    step "ruff"; ruff check "${dirs[@]}"
    step "pytest"; set +e; pytest -q; rc=$?; set -e
    [ $rc -ne 5 ] || fail "no tests collected. Tests come first (WORKFLOW.md §3)."
    [ $rc -eq 0 ] || exit $rc
    [ -f .importlinter ] || fail ".importlinter missing (card A-01 creates it)."
    need lint-imports "pip install import-linter"
    step "import-linter"; lint-imports
    contract ;;
  b)
    need npm "Install Node 20+."
    [ -f web/package.json ] || fail "web/package.json missing (card B-01 creates it)."
    step "typecheck"; (cd web && npm run -s typecheck)
    step "lint";      (cd web && npm run -s lint)
    step "test";      (cd web && npm run -s test -- --run)
    contract ;;
  contract) contract ;;
  *) echo "usage: scripts/gate.sh a | b | contract" >&2; exit 2 ;;
esac
echo; echo "GATE PASS ($1)"
