# Review Request: discussion-20260416092414328 (rev9)

| Key              | Value                                                                        |
|------------------|------------------------------------------------------------------------------|
| Review Pack ID   | review-20260416092414328                                                     |
| Discussion ID    | discussion-20260416092414328                                                 |
| Timestamp        | 2026-04-16T09:24:14.328Z                                                     |
| Routing Profile  | requirements-heavy                                                           |
| Profile Source   | `.qfai/assistant/steering/agent-routing.yml` (skill: qfai-discussion)       |

## Required Reviewers

| Role                      | Required | Trigger                                                                         |
|---------------------------|----------|---------------------------------------------------------------------------------|
| completion-reviewer       | YES      | Always required (requirements-heavy profile)                                    |
| requirements-reviewer     | YES      | Always required (requirements-heavy profile)                                    |
| architecture-reviewer     | YES      | Conditional: validator contract surface extension + bundleWriter breaking change |
| product-surface-reviewer  | NO       | Non-UI pack (ui_bearing: false)                                                 |

## Review Scope

- `.qfai/discussion/discussion-20260416092414328/01_Context.md`
- `.qfai/discussion/discussion-20260416092414328/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260416092414328/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260416092414328/04_Sources.md`
- `.qfai/discussion/discussion-20260416092414328/05_Scope.md`
- `.qfai/discussion/discussion-20260416092414328/06_REQ.md`
- `.qfai/discussion/discussion-20260416092414328/07_NFR.md`
- `.qfai/discussion/discussion-20260416092414328/08_Glossary.md`
- `.qfai/discussion/discussion-20260416092414328/09_Constraints.md`
- `.qfai/discussion/discussion-20260416092414328/10_Policy.md`
- `.qfai/discussion/discussion-20260416092414328/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260416092414328/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260416092414328/13_Deferred.md`
- `.qfai/discussion/discussion-20260416092414328/14_Review-Request.md`
- `.qfai/discussion/discussion-20260416092414328/99_delta.md`

## Validate Gate

- `qfai validate --fail-on error --format github` must be run against latest artifacts.
