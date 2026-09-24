# Review Request

## Scope

- Producer: `discussion`
- scope: `discussion-20260923063306456`
- layer: `discussion`
- review-pack: `review-20260923081445724`

## Target Files

- `.qfai/discussion/discussion-20260923063306456/01_Context.md`
- `.qfai/discussion/discussion-20260923063306456/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260923063306456/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260923063306456/04_Sources.md`
- `.qfai/discussion/discussion-20260923063306456/05_Scope.md`
- `.qfai/discussion/discussion-20260923063306456/06_REQ.md`
- `.qfai/discussion/discussion-20260923063306456/07_NFR.md`
- `.qfai/discussion/discussion-20260923063306456/08_Glossary.md`
- `.qfai/discussion/discussion-20260923063306456/09_Constraints.md`
- `.qfai/discussion/discussion-20260923063306456/10_Policy.md`
- `.qfai/discussion/discussion-20260923063306456/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260923063306456/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260923063306456/13_Deferred.md`
- `.qfai/discussion/discussion-20260923063306456/14_Review-Request.md`
- `.qfai/discussion/discussion-20260923063306456/99_delta.md`
- Stage evidence: `.qfai/evidence/discussion-20260923063306456.md`

## Answered demands

None

## Review Focus

- Verify repository-fact lookup evidence under
  `.qfai/assistant/skills/qfai-discussion/SKILL.md#reviewer-gate-must`.
- Judge planning-stage decisions under
  `.qfai/assistant/constitution/review-convergence.md#discussion-review-precision`.
- Correctness against the user's decisions recorded in the stage evidence
  `## Grilling Session` (Q1–Q20); the pack must not reopen or widen them.
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
  - Scope boundary (in/out) is consistent across text/diagram/table
  - Acceptance criteria are consistent with flows/state transitions
  - Security/operations risks are reflected in diagrams where relevant
- Mermaid diagrams use ` ```mermaid ` fences only (no ` ```text ` or language-less fences)
- Surface is classified `non-ui`, so the UI-bearing checks do not apply.
- OQ register exit condition (open count = 0)
- Deferred items have full metadata in `13_Deferred.md`
- Validate hard gate evidence exists (`.qfai/report/validate.log`).
- Coverage hard gates are clear.

## Grilling Session

| Ended     | Ended at             | Authoring began      | Frontier | Lookups        | Decisions | Escalated |
| --------- | -------------------- | -------------------- | -------- | -------------- | --------- | --------- |
| confirmed | 2026-09-23T07:55:21Z | 2026-09-23T07:57:45Z | empty    | none in flight | 20        | 0         |

## Required Reviewers

- Routing profile `requirements-heavy`: `completion-reviewer` and
  `requirements-reviewer` (always required, blocking).
- Conditional: `architecture-reviewer` — the pack settles
  architecture-affecting decisions (layout, configuration merge, assistant
  tree reorganisation).
- Allowed in-flight verdicts: `PASS`, `REVISE`.

## RCP Rules (Mandatory)

- Blocking feedback triggers immediate return (`changes_requested`). Reports
  alone do not reopen an answered demand, and advice a reviewer marks
  non-normative under
  `.qfai/assistant/constitution/review-convergence.md#discussion-review-precision`
  is recorded and carried to the stage that implements the change rather than
  returning the pack.
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
