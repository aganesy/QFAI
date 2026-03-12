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
- HTML+CSS screen mock is usable for UI alignment when UI requirements exist
  - If UI requirements exist and no screen mock is provided, request changes
- OQ register exit condition (open count = 0)
- Deferred items have full metadata in `13_Deferred.md`
- Validate hard gate evidence exists (`.qfai/report/validate.log`).
- Coverage hard gates are clear.

## Required Reviewers

- Load all reviewers from `.qfai/assistant/steering/review-roster.yml`.
- Run all reviewers in roster order for every cycle.
- Allowed verdicts: `PASS`, `FAIL`, `N/A` (`N/A` requires `na_rule` reason).

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`FAIL`).
- After fixes, create a new review-pack and restart reviewer sequence from the first reviewer.
- Set `overall_status: PASS` only when all required reviewers are `PASS` or valid `N/A`, and no unresolved `FAIL` remains.
