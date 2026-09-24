# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                      | Expected                                                                                                                                                               |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0102-01 | AC-0001-0102-01 | Given `/qfai-prototyping` starts a new iteration When the skill prepares execution planning                                                | Then it records `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`                                                                           |
| EX-0001-0102-02 | AC-0001-0102-01 | Given the prototyping skill prepares a delegation scope table before the first review. When execution planning records the delegation map. | Then implementation, review, and build roles are named; an opt-in `--capture` run also names capture responsibility. Invalid assignments are surfaced before dispatch. |
