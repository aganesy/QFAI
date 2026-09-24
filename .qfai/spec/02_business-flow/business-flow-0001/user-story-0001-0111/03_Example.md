# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                         | Expected                                                                                                                                                                         |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0111-01 | AC-0001-0111-01 | Given `iter-NN/review.json` with `layoutAntiPatternsDetected: ["lap-007-state-not-represented"]` and `informationArchitecture: "strong"`. When validate runs. | Then `QFAI-PROT-021` is raised because the lap detection caps `informationArchitecture` at `acceptable`. With `informationArchitecture: "acceptable"` the finding is not raised. |
| EX-0001-0111-02 | AC-0001-0111-02 | `iter-01/review.json` includes `layoutAntiPatternsDetected: ["lap-999-unknown"]`, an ID absent from `layoutAntiPatterns.json`.                                | Validation raises `QFAI-PROT-002` for the undeclared ID; replacing it with a registry-declared `lap-*` ID removes that unknown-ID finding.                                       |
