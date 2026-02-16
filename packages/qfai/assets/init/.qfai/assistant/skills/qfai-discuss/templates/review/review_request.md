# Review Request

## Scope

- scope: `<shared|spec-0001|discuss-0001|require-0001>`
- layer: `<objective|initiative|capabilities|business-flow|user-stories|acceptance-criteria|business-rules|examples|test-cases|plan>`
- attempt: `attempt-01`

## Target Files

- `<path/to/target-file-1>`
- `<path/to/target-file-2>`

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks

## Required Reviewers

- `qa-lead`
- `qa-gatekeeper`
- `reviewer`

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, increment attempt and restart reviewer sequence from the first reviewer.
- Only attempts with all reviewers `pass` and zero feedback may be marked `fixed`.
