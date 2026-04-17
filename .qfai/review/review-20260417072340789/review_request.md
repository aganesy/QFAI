# Review Request

## Scope

- scope: `discussion-20260417072340789`
- layer: `discussion`
- review-pack: `review-20260417072340789`

## Target Files

- `.qfai/discussion/discussion-20260417072340789/01_Context.md`
- `.qfai/discussion/discussion-20260417072340789/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260417072340789/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260417072340789/04_Sources.md`
- `.qfai/discussion/discussion-20260417072340789/05_Scope.md`
- `.qfai/discussion/discussion-20260417072340789/06_REQ.md`
- `.qfai/discussion/discussion-20260417072340789/07_NFR.md`
- `.qfai/discussion/discussion-20260417072340789/08_Glossary.md`
- `.qfai/discussion/discussion-20260417072340789/09_Constraints.md`
- `.qfai/discussion/discussion-20260417072340789/10_Policy.md`
- `.qfai/discussion/discussion-20260417072340789/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260417072340789/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260417072340789/13_Deferred.md`
- `.qfai/discussion/discussion-20260417072340789/14_Review-Request.md`
- `.qfai/discussion/discussion-20260417072340789/99_delta.md`

## Review Focus

- Correctness against source requirements (rev11 design doc)
- Consistency with upstream/downstream artifacts (rev10 continuity)
- Testability and acceptance clarity (REQ ↔ AC mapping)
- Operational and security risks (fail-closed policy coverage)
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
- Mermaid diagrams use ` ```mermaid ` fences only
- OQ register exit condition (open count = 0)
- Deferred items have full metadata in `13_Deferred.md`
- Architecture-affecting changes: public surface reduction + semantic predicate narrowing

## Required Reviewers

- routing_profile: `requirements-heavy`
- always_required: `completion-reviewer`, `requirements-reviewer`
- conditional: `architecture-reviewer` (architecture-affecting decisions: WS-1/WS-2)
- ui_bearing: false → `product-surface-reviewer` NOT required
- Allowed verdicts: `PASS`, `FAIL`.

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
