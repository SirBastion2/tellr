# Contract changes

**CONTRACT_VERSION: 1.0.0**

Protocol: WORKFLOW.md §5. Fixtures are regenerated, never hand-edited. After applying a change, run
`python3 scripts/check_contract.py --rehash`.

### CHANGE-000 · Stop precedence · applied in 1.0.0
Architecture §8.4 doesn't say what happens when a recommended stop and the empty-candidate hard stop
coincide. Resolution: the hard stop wins `kind`; `reason` names both; `question` is null. This
keeps §11.2's rule that `question` is null only on a hard stop. Appears in T1's final step.

### CHANGE-001 · Settings endpoint · proposed
`GET /settings` → `{recommender: "rules" | "local_llm" | "hosted_llm", model_id, strict_mode}`;
`POST /settings {recommender}` → the same. Needed for architecture §7.4's runtime switch and §12's
Settings screen. The switch shows up in later `RecommendationIssued.source` values.
Approved: Driver A ☐ · Driver B ☐ · Rejected ☐

### CHANGE-002 · Error response shape · proposed
Rejected commands return `409 {"error": {"code", "message"}}`, with codes such as
`outcome_requires_actor`, `close_without_outcome`, `purpose_required_on_opener`,
`purpose_not_allowed`, `session_closed`, `scenario_on_live_session`. Malformed bodies return 422.
Approved: Driver A ☐ · Driver B ☐ · Rejected ☐

### Approval of contract-v1
Driver A ☐ · Driver B ☐
