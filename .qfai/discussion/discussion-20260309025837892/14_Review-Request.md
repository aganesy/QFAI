# 14 Review Request

## Scope

- scope: `discussion-20260309025837892`
- layer: `discussion`
- review-pack: `review-20260309025837892`

## Target Files

- `.qfai/discussion/discussion-20260309025837892/01_Context.md`
- `.qfai/discussion/discussion-20260309025837892/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260309025837892/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260309025837892/04_Sources.md`
- `.qfai/discussion/discussion-20260309025837892/05_Scope.md`
- `.qfai/discussion/discussion-20260309025837892/06_REQ.md`
- `.qfai/discussion/discussion-20260309025837892/07_NFR.md`
- `.qfai/discussion/discussion-20260309025837892/08_Glossary.md`
- `.qfai/discussion/discussion-20260309025837892/09_Constraints.md`
- `.qfai/discussion/discussion-20260309025837892/10_Policy.md`
- `.qfai/discussion/discussion-20260309025837892/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260309025837892/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260309025837892/13_Deferred.md`
- `.qfai/discussion/discussion-20260309025837892/14_Review-Request.md`
- `.qfai/discussion/discussion-20260309025837892/99_delta.md`

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
  - Scope boundary (in/out) is consistent across text/diagram/table
  - Acceptance criteria are consistent with flows/state transitions
  - Security/operations risks are reflected in diagrams where relevant
- Mermaid diagrams use ` ```mermaid ` fences only
- HTML+CSS screen mock is usable for UI alignment when UI requirements exist
  - UI要件なし（CLIツール）: Screen mockは N/A
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
