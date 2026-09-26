# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                | Expected                                                                                            |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| EX-0003-0015-01 | AC-0003-0015-01 | 違反なしで `qfai guardrails check`                                                                                   | `guardrails check: error=0 warning=0`、exit 0                                                       |
| EX-0003-0015-02 | AC-0003-0015-02 | `qfai guardrails check` with one entry missing its type (`QFAI-GR-003`) and one with an invalid type (`QFAI-GR-004`) | Those two issue lines, then `guardrails check: error=2 warning=0`, and exit 1                       |
| EX-0003-0015-03 | AC-0003-0015-01 | `qfai guardrails check` with one `DG-0001` entry that has no rationale and no reconsideration condition              | `QFAI-GR-006` and `QFAI-GR-007` issue lines, then `guardrails check: error=0 warning=2`, and exit 0 |
