# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                    | Expected                                                                                                                                                                           |
| --------------- | --------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0061-01 | AC-0001-0061-01 | A report needs current validation data, when `qfai report --run-validate` runs           | Its sections derive from the validation it ran                                                                                                                                     |
| EX-0001-0061-02 | AC-0001-0061-02 | A CI environment and a story tree, when `qfai report --run-validate --profile atdd` runs | The written validate result carries `QFAI-VALIDATE-017` at warning, the report warns that a full scan is still needed, and that finding alone does not make the exit code non-zero |
