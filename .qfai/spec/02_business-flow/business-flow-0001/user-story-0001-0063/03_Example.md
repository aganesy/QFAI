# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                               | Expected                                                 |
| --------------- | --------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| EX-0001-0063-01 | AC-0001-0063-01 | Given a report needs current validation data When `qfai report --run-validate` runs | Then its sections derive from the validation it ran      |
| EX-0001-0063-02 | AC-0001-0063-02 | Given validation output identifies the current phase When `qfai report` runs        | Then the report respects the phase guard from validation |
