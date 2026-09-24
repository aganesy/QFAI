# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                            | Expected                                                                          |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| EX-0001-0112-01 | AC-0001-0112-01 | Given cycle 0 has a valid target URL and one UI-bearing `CON-UI-0001` contract. When `qfai prototyping iterate --cycle 0` runs.                                                  | Then it exits 0 and creates `iter-00/iterate-plan.json` for `CON-UI-0001`.        |
| EX-0001-0112-02 | AC-0001-0112-01 | Given cycle 0 has a UI-bearing contract but no target URL. When `qfai prototyping iterate --cycle 0` runs.                                                                       | Then it exits 2 with an input-validation error.                                   |
| EX-0001-0112-03 | AC-0001-0112-01 | Given every frozen UI contract and screen has empty `blockingFindings[]`, `layoutAntiPatternsDetected[]`, and `designMdViolations[]`. When the next cycle evaluates convergence. | Then it exits 64 for convergence without requiring exceptional ordinal UX scores. |
| EX-0001-0112-04 | AC-0001-0112-01 | Given a cycle before index 9 has a blocking finding and no drift. When the next cycle is requested.                                                                              | Then it exits 0 to continue the same lineage.                                     |
