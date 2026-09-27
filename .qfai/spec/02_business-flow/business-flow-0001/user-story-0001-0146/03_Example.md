# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                        | Expected                                                                                                                                                                                                                                   |
| --------------- | --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EX-0001-0146-01 | AC-0001-0146-01 | Given `qfai prototyping iterate --cycle 10`, When iterate validates the arg, | Then stderr reads `--cycle accepts 0..9 (=10 cycles total). --cycle 10 would be the 11th cycle and is not supported.` and recommends `--cycle 9 --check-convergence`. A second invocation with `--cycle -1` surfaces the same error class. |
