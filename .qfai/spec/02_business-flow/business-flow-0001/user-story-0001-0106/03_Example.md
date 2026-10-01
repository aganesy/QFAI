# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                              | Expected                                                                                                |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| EX-0001-0106-01 | AC-0001-0106-01 | Seven convergence-mode iterations have indices 0 through 6, and iteration 4 has a higher ordinal score than iteration 6, when `acceptedIterationIndex` is recorded | It is 6, the latest convergence iteration; the earlier score does not trigger best-of-history selection |
