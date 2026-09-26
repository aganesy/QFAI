# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                      | Expected                                                   |
| --------------- | --------------- | ------------------------------------------ | ---------------------------------------------------------- |
| EX-0003-0016-01 | AC-0003-0016-01 | `qfai guardrails`（action 未指定）         | "action is required (list\|extract\|check)" エラー、exit 2 |
| EX-0003-0016-02 | AC-0003-0016-02 | `qfai guardrails list --path /nonexistent` | エラーメッセージ表示、exit 2                               |
