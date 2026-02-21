# Review Request

## Scope

- scope: `<shared|spec-0001|discuss-YYYYMMDDhhmmssSSS|require-YYYYMMDDhhmmssSSS>`
- layer: `<objective|initiative|capabilities|business-flow|user-stories|acceptance-criteria|business-rules|examples|test-cases|plan>`
- review-pack: `review-YYYYMMDDhhmmssSSS`

## Target Files

- `<path/to/target-file-1>`
- `<path/to/target-file-2>`

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams use ` ```mermaid ` fences only (no ` ```text ` or language-less fences)
- Business Flow artifacts include required `flowchart` or `sequenceDiagram` where applicable
- Validate hard gate evidence exists (`.qfai/report/validate.log`).
- Coverage hard gates are clear (`QFAI-COV-201/202/203/204/205/206` = 0).
- ATDD annotation hard gates are clear (`QFAI-ATDD-101/102/103/111/112/113/121/122` = 0).
- `specs-coverage/spec-*.md` was reviewed and density-smell findings (for example `QFAI-COV-207`) are called out as perspective gaps.
- `atdd-traceability/summary.md` was reviewed for annotation omissions, directory violations, forbidden TC references, and missing coverage.

## Required Reviewers

- Load all reviewers from `.qfai/assistant/steering/review-roster.yml`.
- Run all reviewers in roster order for every cycle.
- Allowed verdicts: `PASS`, `FAIL`, `N/A` (`N/A` requires `na_rule` reason).

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, create a new review-pack and restart reviewer sequence from the first reviewer.
- Set `overall_status: PASS` only when all required reviewers are `PASS` or valid `N/A`, and no unresolved `FAIL` remains.
