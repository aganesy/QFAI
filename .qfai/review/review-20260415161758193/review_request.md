# Review Request

## Scope

- scope: `discussion-20260415161758193`
- layer: `discussion`
- review-pack: `review-20260415161758193`

## Target Files

- `.qfai/discussion/discussion-20260415161758193/01_Context.md`
- `.qfai/discussion/discussion-20260415161758193/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260415161758193/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260415161758193/04_Sources.md`
- `.qfai/discussion/discussion-20260415161758193/05_Scope.md`
- `.qfai/discussion/discussion-20260415161758193/06_REQ.md`
- `.qfai/discussion/discussion-20260415161758193/07_NFR.md`
- `.qfai/discussion/discussion-20260415161758193/08_Glossary.md`
- `.qfai/discussion/discussion-20260415161758193/09_Constraints.md`
- `.qfai/discussion/discussion-20260415161758193/10_Policy.md`
- `.qfai/discussion/discussion-20260415161758193/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260415161758193/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260415161758193/13_Deferred.md`
- `.qfai/discussion/discussion-20260415161758193/14_Review-Request.md`
- `.qfai/discussion/discussion-20260415161758193/99_delta.md`

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
- OQ register exit condition (open count = 0)
- Deferred items have full metadata in `13_Deferred.md`
- Architecture-affecting decision consistency (OQ-0002 through OQ-0005)

## Required Reviewers

Routing profile: `requirements-heavy`
- `completion-reviewer` (always required)
- `requirements-reviewer` (always required)
- `architecture-reviewer` (conditional: architecture-affecting decisions exist — OQ-0002, OQ-0003, OQ-0004, OQ-0005)
- `product-surface-reviewer` (skipped: ui_bearing = false)

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
