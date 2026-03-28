# 14 Review Request

## Scope

- scope: `discussion-20260328120000000`
- layer: `discussion`
- review-pack: `review-20260328120000000`

## Target Files

- `.qfai/discussion/discussion-20260328120000000/01_Context.md`
- `.qfai/discussion/discussion-20260328120000000/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260328120000000/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260328120000000/04_Sources.md`
- `.qfai/discussion/discussion-20260328120000000/05_Scope.md`
- `.qfai/discussion/discussion-20260328120000000/06_REQ.md`
- `.qfai/discussion/discussion-20260328120000000/07_NFR.md`
- `.qfai/discussion/discussion-20260328120000000/08_Glossary.md`
- `.qfai/discussion/discussion-20260328120000000/09_Constraints.md`
- `.qfai/discussion/discussion-20260328120000000/10_Policy.md`
- `.qfai/discussion/discussion-20260328120000000/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260328120000000/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260328120000000/13_Deferred.md`
- `.qfai/discussion/discussion-20260328120000000/14_Review-Request.md`
- `.qfai/discussion/discussion-20260328120000000/99_delta.md`

## Review Focus

- Core pack integrity preserved after sidecar addition
- specs/discussion/contracts responsibility separation maintained
- UI-bearing vs non-UI branching is clear in SKILL.md design
- Generic fallback pressure removed from direct templates
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
