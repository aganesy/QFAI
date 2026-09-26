# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                         | Expected                                                                                                                                  |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0115-01 | AC-0001-0115-01 | Given cycle 0 recorded a DESIGN.md SHA of `abc123`, and the file now hashes to `def456`, and no `DESIGN.md.lock.yaml` exists. When `qfai prototyping iterate --cycle 1` runs. | Then it exits 2 with `DESIGN.md hash mismatch`, instructs the operator to re-seed from cycle 0, and writes no review payload for cycle 1. |
