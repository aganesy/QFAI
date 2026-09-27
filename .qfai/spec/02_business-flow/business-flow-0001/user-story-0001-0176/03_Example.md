# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                         | Expected                                                                                                                                                                                                                                                         |
| --------------- | --------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0176-01 | AC-0001-0176-01 | An `AskUserQuestion` whose template names "architectural decision", when the operator answers | The skill body writes `.qfai/evidence/decision/2026-05-27T08-15-30Z.json` `{question, answer, scope: "architectural-decision", operatorIdentity, timestamp, envelopeContractClause}`, and a routine prompt that names none of the four contexts writes no record |
