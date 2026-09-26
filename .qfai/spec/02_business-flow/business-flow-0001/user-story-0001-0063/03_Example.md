# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                         | Expected                                                                                                                                                                                |
| --------------- | --------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0063-01 | AC-0001-0063-01 | Given a report needs current validation data When `qfai report --run-validate` runs           | Then its sections derive from the validation it ran                                                                                                                                     |
| EX-0001-0063-02 | AC-0001-0063-02 | Given a CI environment and a story tree When `qfai report --run-validate --profile atdd` runs | Then the written validate result carries `QFAI-VALIDATE-017` at warning, the report warns that a full scan is still needed, and that finding alone does not make the exit code non-zero |
