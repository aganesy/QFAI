# Review Request

## Scope

- scope: `discussion-20260416195444737`
- layer: `discussion`
- review-pack: `review-20260416195500000`

## Target Files

- `.qfai/discussion/discussion-20260416195444737/01_Context.md`
- `.qfai/discussion/discussion-20260416195444737/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260416195444737/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260416195444737/04_Sources.md`
- `.qfai/discussion/discussion-20260416195444737/05_Scope.md`
- `.qfai/discussion/discussion-20260416195444737/06_REQ.md`
- `.qfai/discussion/discussion-20260416195444737/07_NFR.md`
- `.qfai/discussion/discussion-20260416195444737/08_Glossary.md`
- `.qfai/discussion/discussion-20260416195444737/09_Constraints.md`
- `.qfai/discussion/discussion-20260416195444737/10_Policy.md`
- `.qfai/discussion/discussion-20260416195444737/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260416195444737/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260416195444737/13_Deferred.md`
- `.qfai/discussion/discussion-20260416195444737/14_Review-Request.md`
- `.qfai/discussion/discussion-20260416195444737/99_delta.md`

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
- Mermaid diagrams use ```mermaid fences only
- OQ register exit condition (open count = 0)
- Deferred items have full metadata in `13_Deferred.md`
- Validate hard gate evidence exists (`.qfai/report/validate.log`).
- Coverage hard gates are clear.

## Required Reviewers

- Resolve reviewers from `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.
- Profile: `requirements-heavy` — always required: `completion-reviewer`, `requirements-reviewer`
- Conditional: `architecture-reviewer` (applied: architecture-affecting decisions in WS-1~WS-4)
- No `product-surface-reviewer` (ui_bearing: false)

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
