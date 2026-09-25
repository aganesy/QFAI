# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                              | Expected                                                        |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| EX-0001-0045-01 | AC-0001-0045-01 | Given a reviewer report JSON containing `{"code": "R-WORKLOG-DRIFT", "justification": ""}` When `qfai validate` ingests it                                                         | Then validate exits with error severity (advisory-failing)      |
| EX-0001-0045-02 | AC-0001-0045-02 | Given `.qfai/steering/handoff-001.md` with `kind: handoff` and body containing only `## State` and `## Next action` (missing Constraints/OQs/References) When `qfai validate` runs | Then `R-HANDOFF-INCOMPLETE` fires naming the 3 missing sections |
