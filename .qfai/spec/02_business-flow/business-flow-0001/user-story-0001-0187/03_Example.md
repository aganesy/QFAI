# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                           | Expected                                                                                                                          |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0187-01 | AC-0001-0187-01 | A diagnose result with verdict `defective-test` whose first matched ID is a criterion, for an acceptance test with a flaky wait | The work moves to `repair-test`, whose `fix` stage runs `implement-test-fix`, which repairs the acceptance test; then verify runs |
| EX-0001-0187-06 | AC-0001-0187-01 | A diagnose result with verdict `defective-test` whose first matched ID is an example, the defective test a unit test            | The work moves to `repair-test`; `implement-test-fix` repairs the unit test; then verify runs                                     |
