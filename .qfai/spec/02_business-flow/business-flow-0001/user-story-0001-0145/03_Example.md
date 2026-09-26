# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                             | Expected                                                                                                                                                                                                                                                                 |
| --------------- | --------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EX-0001-0145-01 | AC-0001-0145-01 | Given a finished cycle 3, When iterate finalises, | Then `iter-03/iterate-context.json` is written with `{priorCycle: 3, priorScores: {informationArchitecture: "acceptable", ...}, openBlockers: ["lap-009 on home/dashboard"], priorTailwindContract: "β+γ"}`. The file is advisory; certify ignores its presence/absence. |
