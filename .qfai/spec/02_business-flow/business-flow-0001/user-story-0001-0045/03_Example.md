# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                            | Expected                                                                                                      |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| EX-0001-0045-01 | AC-0001-0045-01 | Given a reviewer report JSON containing `{"code": "R-REJECTED-READOPT", "justification": ""}`, a finding whose `justification` is `"   "`, and a finding with no `justification` When `qfai validate` ingests it | Then each of the three is an error (advisory-failing) And a non-empty justification raises no ingestion error |
