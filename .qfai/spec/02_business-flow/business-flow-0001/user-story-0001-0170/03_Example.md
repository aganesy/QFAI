# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                               | Expected                                                                                |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| EX-0001-0170-01 | AC-0001-0170-02 | Given devils-advocate returns FAIL 3 consecutive times (each with alternative) When demotion check runs             | Then advisory demotion: blocking power lost, progression allowed                        |
| EX-0001-0170-02 | AC-0001-0170-01 | Given `devils-advocate` returns FAIL with only “I disagree” and no concrete alternative When the verdict is checked | Then the bare-negation FAIL is rejected and re-judgment requests a concrete alternative |
