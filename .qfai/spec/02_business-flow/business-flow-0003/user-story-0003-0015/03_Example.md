# Examples

## Examples

| EX-ID           | AC-Ref          | Input                               | Expected                                                        |
| --------------- | --------------- | ----------------------------------- | --------------------------------------------------------------- |
| EX-0003-0015-01 | AC-0003-0015-01 | 違反なしで `qfai guardrails check`  | `guardrails check: error=0 warning=0`、exit 0                   |
| EX-0003-0015-02 | AC-0003-0015-02 | 違反 2 件で `qfai guardrails check` | 2 件の Issue 行 + `guardrails check: error=2 warning=0`、exit 1 |
