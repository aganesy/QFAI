# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                              | Expected                                                                  |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| EX-0001-0040-01 | AC-0001-0040-01 | A screen contract declares `orders-dashboard`, screenshot evidence is missing, and the profile is `prototyping` or `saas-package`  | Validate emits `QFAI-UIE-001`                                             |
| EX-0001-0040-02 | AC-0001-0040-02 | A screen contract declares `orders-dashboard`, HTML evidence is missing, and the profile is `prototyping` or `saas-package`        | Validate emits `QFAI-UIE-002`                                             |
| EX-0001-0040-03 | AC-0001-0040-03 | No screen contract exists                                                                                                          | `validateUiEvidenceArtifacts` returns no issue                            |
| EX-0001-0040-04 | AC-0001-0040-04 | A screen contract declares `orders-dashboard`, `.qfai/evidence/prototyping/` does not exist, and the profile is `full` or `verify` | Validate emits none of `QFAI-PROT-001`, `QFAI-UIE-001` and `QFAI-UIE-002` |
| EX-0001-0040-05 | AC-0001-0040-04 | The same project under the `prototyping` or `saas-package` profile                                                                 | Validate emits `QFAI-PROT-001`, `QFAI-UIE-001` and `QFAI-UIE-002`         |
| EX-0001-0040-06 | AC-0001-0040-04 | The same project with an empty `.qfai/evidence/prototyping/` directory, under `full` or `verify`                                   | Validate emits `QFAI-PROT-001`, `QFAI-UIE-001` and `QFAI-UIE-002`         |
