# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                      | Expected                                                                                                                                                                            |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0102-01 | AC-0001-0102-01 | Given `/qfai-prototyping` starts a new iteration When the skill prepares execution planning                                                | Then it records `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`                                                                                        |
| EX-0001-0102-02 | AC-0001-0102-01 | Given the prototyping skill prepares a delegation scope table before the first review. When execution planning records the delegation map. | Then the execution-planning record carries the delegation map before the first review, and an invalid role assignment in it is reported at planning, before any role is dispatched. |
