# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                       | Expected                                                                                  |
| --------------- | --------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| EX-0003-0014-01 | AC-0003-0014-01 | `qfai guardrails extract --keyword "symlink"`               | "symlink" を含むガードレールのみ LLM フォーマットで出力                                   |
| EX-0003-0014-02 | AC-0003-0014-02 | `qfai guardrails extract --max 5`                           | 最大 5 件が出力される                                                                     |
| EX-0003-0014-03 | AC-0003-0014-01 | `qfai guardrails extract` with one explicit `DG-0001` entry | The LLM output contains the ID, type, statement, rationale, and reconsideration condition |
