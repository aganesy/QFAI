# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                 | Expected                                                                                                                         |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0071-03 | AC-0001-0071-05 | A configured E2E or integration test annotates an undefined BF, AC or EX ID, alongside one defined ID | `qfai validate` reports each undefined ID with its file as an error, while the defined ID raises no undeclared-reference finding |
