# 14 Review Request

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329120000000 |
| Date          | 2026-03-29                   |

## Review Target

- **Pack**: `.qfai/discussion/discussion-20260329120000000/`
- **Scope**: discussion
- **Files**: All 15 mandatory files (01_Context through 99_delta)

## Review Roster

Roster sourced from `.qfai/assistant/steering/review-roster.yml` (schema_version: 1.0).

| Order | Reviewer ID              | Name                      | can_be_na |
| ----- | ------------------------ | ------------------------- | --------- |
| 1     | qa-lead                  | Quality Lead              | false     |
| 2     | qa-gatekeeper            | QA Gatekeeper             | false     |
| 3     | reviewer                 | Independent Reviewer      | false     |
| 4     | code-reviewer            | Code Reviewer             | true      |
| 5     | architect-reviewer       | Architect Reviewer        | true      |
| 6     | qa-reviewer              | QA Reviewer               | true      |
| 7     | frontend-reviewer        | Frontend Reviewer         | true      |
| 8     | backend-reviewer         | Backend Reviewer          | true      |
| 9     | design-review-lead       | Design Review Lead        | true      |
| 10    | runtime-gatekeeper       | Runtime Gatekeeper        | true      |
| 11    | devils-advocate          | Devil's Advocate          | false     |
| 12    | pattern-doubler          | Pattern Doubler           | true      |
| 13    | integrated-uiux-reviewer | Integrated UI/UX Reviewer | true      |

## Review Focus Areas

1. deterministic validate と semantic review が混ざっていないか
2. `UIX-VAL-*` が reviewer judgement を hard gate 化していないか
3. old projects への導入路が十分か
4. error text / report UX が actionable か
5. REQ と NFR の境界が崩れていないか
6. Example Seeds の perspective coverage が十分か
7. OQ register の open count が zero であること

## Pre-Review Checklist

- [x] All 15 mandatory files are present
- [x] OQ Register open count is zero
- [x] Deferred items have full metadata
- [x] 02_Inception-Deck.md contains Mermaid diagram
- [x] 03_Story-Workshop.md contains Mermaid diagram
- [x] Example Seeds cover all 6 perspectives
- [x] Non-UI project immunity is explicitly addressed (US-D005)
