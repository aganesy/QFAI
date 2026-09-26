# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                         | Expected                                                   |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| EX-0001-0045-01 | AC-0001-0045-01 | Given a reviewer report JSON containing `{"code": "R-REJECTED-READOPT", "justification": ""}` When `qfai validate` ingests it | Then validate exits with error severity (advisory-failing) |
