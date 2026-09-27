# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                       | Expected                                                                                              |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| EX-0001-0045-01 | AC-0001-0045-01 | A reviewer report JSON containing `{"code": "R-REJECTED-READOPT", "justification": ""}`, a finding whose `justification` is `"   "`, and a finding with no `justification`, when `qfai validate` ingests it | Each of the three is an error (advisory-failing); a non-empty justification raises no ingestion error |
