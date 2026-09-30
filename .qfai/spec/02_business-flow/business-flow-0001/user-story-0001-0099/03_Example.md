# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                               | Expected                                                                                                                                                                      |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0099-01 | AC-0001-0099-01 | `/qfai-prototyping` starts a new iteration, when the skill prepares execution planning                                              | It records `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`                                                                                       |
| EX-0001-0099-02 | AC-0001-0099-01 | The prototyping skill prepares a delegation scope table before the first review, when execution planning records the delegation map | The execution-planning record carries the delegation map before the first review, and an invalid role assignment in it is reported at planning, before any role is dispatched |
