# 14 Review Request

## Scope

- scope: `discussion-YYYYMMDDhhmmssSSS`
- layer: `discussion`
- review-pack: `review-YYYYMMDDhhmmssSSS`

## Target Files

- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/01_Context.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/02_Inception-Deck.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/03_Story-Workshop.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/04_Sources.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/05_Scope.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/06_REQ.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/07_NFR.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/08_Glossary.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/09_Constraints.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/10_Policy.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/11_OQ-Register.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/13_Deferred.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/14_Review-Request.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/99_delta.md`

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams use ` ```mermaid ` fences only
- OQ register exit condition (open count = 0)
- Deferred items have full metadata

## Required Reviewers

- Load all reviewers from `.qfai/assistant/steering/review-roster.yml`.
- Run all reviewers in roster order for every cycle.
- Allowed verdicts: `PASS`, `FAIL`, `N/A` (`N/A` requires `na_rule` reason).

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, create a new review-pack and restart reviewer sequence from the first reviewer.
- Set `overall_status: PASS` only when all required reviewers are `PASS` or valid `N/A`, and no unresolved `FAIL` remains.
