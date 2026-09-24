# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                         | Expected                                                                                                                                                                         |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0111-01 | AC-0001-0111-01 | Given `iter-NN/review.json` with `layoutAntiPatternsDetected: ["lap-007-state-not-represented"]` and `informationArchitecture: "strong"`. When validate runs. | Then `QFAI-PROT-021` is raised because the lap detection caps `informationArchitecture` at `acceptable`. With `informationArchitecture: "acceptable"` the finding is not raised. |
