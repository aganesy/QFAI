# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                            | Expected                                                                                                                                                                                                                                                      |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0066-02 | AC-0001-0066-01 | Given the story tree with two business flows, and a `validate.json` from a run over both When `qfai report` runs | Then `report.md` is written, and `<outDir>/business-flow-NNNN/` is written once per flow, each holding `coverage.md` and `traceability-graph.json` And no per-spec report is written, and each graph's nodes are of the types BF, US, AC, EX, BR and CON only |
