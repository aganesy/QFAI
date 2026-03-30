# 07 Decisions

## Decisions

| DEC-ID      | Title                                    | Adopted Option                                                                          | Source  | Rationale                                                                                                                                              |
| ----------- | ---------------------------------------- | --------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SD-0036-001 | Browser QA MVP scope: smoke + visual     | Smoke + visual 2-phase MVP for v1.7.8; interaction/accessibility deferred to v1.8.0+    | OQ-0002 | Full 4-phase pipeline exceeds v1.7.8 scope; smoke + visual provides actionable findings without interaction/accessibility complexity                    |
| SD-0036-002 | Render evidence skip behavior            | Skipped + reason + alternative suggestion on capture impossible; no error abort          | OQ-0006 | Error abort would block prototyping workflow; honest skip with alternative maintains workflow continuity while preserving transparency                   |

2 items referenced from _policies/08_Decisions.md: DR-0081 (render evidence wiring to CLI), DR-0084 (default prototyping mode)

## Rejected Options

| DEC-ID      | Rejected Option                                            | Reason                                                                                |
| ----------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| SD-0036-001 | Full 4-phase browser QA (smoke + visual + interaction + a11y) | Exceeds v1.7.8 scope; interaction/accessibility require additional infrastructure     |
| SD-0036-001 | Smoke only (no visual)                                     | Visual phase is low additional cost and provides significant quality signal             |
| SD-0036-002 | Error abort on capture impossible                          | Blocks entire prototyping workflow for a non-critical evidence step                    |
| SD-0036-002 | Silent skip (no reason, no alternative)                    | Violates honest reporting principle; user has no visibility or recovery path            |
