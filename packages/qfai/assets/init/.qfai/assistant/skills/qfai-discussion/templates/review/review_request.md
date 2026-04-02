# Review Request

## Scope

- scope: `discussion-YYYYMMDDhhmmssSSS`
- layer: `discussion`
- review-pack: `review-YYYYMMDDhhmmssSSS`

## Target Files

- `<path/to/target-file-1>`
- `<path/to/target-file-2>`

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
  - Scope boundary (in/out) is consistent across text/diagram/table
  - Acceptance criteria are consistent with flows/state transitions
  - Security/operations risks are reflected in diagrams where relevant
- Mermaid diagrams use ` ```mermaid ` fences only (no ` ```text ` or language-less fences)
- Taste interview completeness and clarity (when UI-bearing)
- Trend freshness and source translation quality (when UI-bearing)
- 3-layer evaluation quality and traceability (when UI-bearing)
- Option comparison integrity and selected direction clarity (when UI-bearing)
- Strong screen contract completeness (when UI-bearing)
- OQ register exit condition (open count = 0)
- Deferred items have full metadata in `13_Deferred.md`
- Validate hard gate evidence exists (`.qfai/report/validate.log`).
- Coverage hard gates are clear.

## Required Reviewers

- Resolve reviewers from `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.
- Always run reviewers listed in `profiles.<routing_profile>.always_required` in `review-profiles.yml`.
- Add conditional reviewers according to `conditional_required` and related routing rules defined in `agent-routing.yml` and `review-profiles.yml` (do not introduce additional ad-hoc conditions in this template).
- Allowed verdicts: `PASS`, `FAIL`.

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
