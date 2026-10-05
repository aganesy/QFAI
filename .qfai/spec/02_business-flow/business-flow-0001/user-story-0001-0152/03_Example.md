# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                       | Expected                                                                                                                                                                                                                                                                         |
| --------------- | --------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0152-01 | AC-0001-0152-01 | The shipped `qfai-sdd` skill tree                                           | No template, reference or step writes any of `exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml` or `brand-design.yaml`; the normalization reference lists the removed contracts as not generated |
| EX-0001-0152-02 | AC-0001-0152-02 | The design inputs the shipped `qfai-sdd` and `qfai-prototyping` skills name | Root `DESIGN.md` alone, authored and validated by `common-design-md/STEP.md#author-and-validate`; the normalization reference names `.qfai/prototype/final/handoff.json` as where the prototyping handoff is recorded                                                            |
