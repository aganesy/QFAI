# Review Request

## Scope

- scope: `<shared|spec-0001|discuss-YYYYMMDDhhmmssSSS|require-YYYYMMDDhhmmssSSS>`
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
- Mermaid diagrams use ` ```mermaid ` fences only (no ` ```text ` or language-less fences)
- Business Flow artifacts include required `flowchart` or `sequenceDiagram` where applicable

## Required Reviewers

- `qa-lead`
- `qa-gatekeeper`
- `reviewer`

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, increment attempt and restart reviewer sequence from the first reviewer.
- Only attempts with all reviewers `pass` and zero feedback may be marked `fixed`.
