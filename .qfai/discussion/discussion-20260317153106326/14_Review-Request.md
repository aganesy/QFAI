# Review Request

## Target

- **Scope:** discussion
- **Pack:** `.qfai/discussion/discussion-20260317153106326/`
- **Files:** 15 mandatory files (01..14, 99)

## Roster Reference

- **Source:** `.qfai/assistant/steering/review-roster.yml`
- **Schema version:** 1.0
- **Total reviewers:** 13

## Review Execution Order

| #   | Reviewer                 | can_be_na |
| --- | ------------------------ | --------- |
| 1   | qa-lead                  | false     |
| 2   | qa-gatekeeper            | false     |
| 3   | reviewer                 | false     |
| 4   | code-reviewer            | true      |
| 5   | architect-reviewer       | true      |
| 6   | qa-reviewer              | true      |
| 7   | frontend-reviewer        | true      |
| 8   | backend-reviewer         | true      |
| 9   | design-review-lead       | true      |
| 10  | runtime-gatekeeper       | true      |
| 11  | devils-advocate          | false     |
| 12  | pattern-doubler          | true      |
| 13  | integrated-uiux-reviewer | true      |

## Gate Rules

- Any **FAIL** stops the cycle and triggers fix + full rerun.
- **N/A** requires na_rule justification.
- All reviewers must provide concrete alternatives on FAIL (`feedback_policy.alternative_required: true`).
- **devils-advocate:** 3 consecutive FAILs triggers advisory demotion.
- **pattern-doubler:** discussion phase — N/A is expected (Example Seeds coverage is evaluation target).
