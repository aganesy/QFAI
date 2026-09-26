# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                              | Expected                                                                                                                                                                                                                                                              |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0176-01 | AC-0001-0176-01 | Given an `AskUserQuestion` whose template names "architectural decision" When the operator answers | Then the skill body writes `.qfai/evidence/decision/2026-05-27T08-15-30Z.json` `{question, answer, scope: "architectural-decision", operatorIdentity, timestamp, envelopeContractClause}`, and a routine prompt that names none of the four contexts writes no record |
