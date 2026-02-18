# Review Request

## Scope

- scope: `<shared|spec-0001|discuss-YYYYMMDDhhmmssSSS|require-YYYYMMDDhhmmssSSS>`
- layer: `<Objective|Initiative|Capabilities|BusinessFlow|Contracts|Glossary|Constraints|Decisions|OpenQuestions|Delta|Spec|UserStories|AcceptanceCriteria|BusinessRules|Examples|TestCases>`
- review-pack: `review-YYYYMMDDhhmmssSSS`

## Target Files

- `<path/to/target-file-1>`
- `<path/to/target-file-2>`

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- BR depth: BR entries decompose AC into decision-level rules
- Example grounding: Examples concretize BR decisions with executable cases
- Test realization: Test-cases implement Examples as verifiable tests
- Density rationale: if BR/Examples/Test-cases counts are sparse, reason and completion plan are documented
- Capability split: CAP order and spec split (`spec-0001 = CAP-0001`, etc.) are preserved
- Parent chain: every US/AC/BR/EX/TC item declares one Parent reference to its upper layer
- Operational and security risks
- Mermaid diagrams use ` ```mermaid ` fences only (no ` ```text ` or language-less fences)
- Business Flow artifacts include required `flowchart` or `sequenceDiagram` where applicable

## Required Reviewers

- `qa-lead`
- `qa-gatekeeper`
- `reviewer`

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, create a new review-pack and restart reviewer sequence from the first reviewer.
- Set `overall_status: PASS` only when all required reviewers pass and feedback_count is zero.
