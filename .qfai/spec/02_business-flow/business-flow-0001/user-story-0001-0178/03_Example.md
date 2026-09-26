# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                      | Expected                                                                                                                                                                                                                                                                                             |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0178-01 | AC-0001-0178-01 | Given a Reviewer report emitting `R-HANDOFF-SCHEMA-DRIFT` with `justification: ""` When `qfai validate` ingests the report | Then it rejects the finding as advisory-failing (empty justification); the same code with a non-empty justification is accepted; all eight catalog codes share this posture, including `R-DESIGN-MD-PATCH-OUT-OF-ZONE`, which its own detector emits at warning; no catalog entry carries a severity |
