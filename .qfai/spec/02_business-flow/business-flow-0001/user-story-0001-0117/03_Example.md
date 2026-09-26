# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                       | Expected                                                                                                                                                                                                           |
| --------------- | --------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EX-0001-0117-01 | AC-0001-0117-01 | Given a fresh run starting cycle 0 with frozen `DESIGN.md`. When the contracts are checked. | Then `.qfai/contracts/design/design-system.yaml` does NOT exist pre-loop. The `qfai prototyping iterate` cycle that ends the loop writes it as a deterministic byte-equivalent mirror of `DESIGN.md` token tables. |
