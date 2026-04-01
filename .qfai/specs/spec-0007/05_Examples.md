# 05 Examples

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                           | Expected                                                           |
| ------------ | ------------ | ----------------------------------------------- | ------------------------------------------------------------------ |
| EX-0007-0001 | BR-0007-0001 | `_policies/07_Constraints.md` に MUST 定義 3 件 | 3 件のガードレールが検出される                                     |
| EX-0007-0002 | BR-0007-0002 | `qfai guardrails list`                          | `- [GR-001][MUST] ... (_policies/07_Constraints.md:10)` 形式で出力 |
| EX-0007-0003 | BR-0007-0002 | ガードレール 0 件で `qfai guardrails list`      | `- (none)` が出力される                                            |
| EX-0007-0004 | BR-0007-0003 | `qfai guardrails extract --keyword "symlink"`   | "symlink" を含むガードレールのみ LLM フォーマットで出力            |
| EX-0007-0005 | BR-0007-0004 | `qfai guardrails extract --max 5`               | 最大 5 件が出力される                                              |
| EX-0007-0006 | BR-0007-0006 | 違反なしで `qfai guardrails check`              | `guardrails check: error=0 warning=0`、exit 0                      |
| EX-0007-0007 | BR-0007-0007 | 違反 2 件で `qfai guardrails check`             | 2 件の Issue 行 + `guardrails check: error=2 warning=0`、exit 1    |
| EX-0007-0008 | BR-0007-0008 | `qfai guardrails`（action 未指定）              | "action is required (list\|extract\|check)" エラー、exit 2         |
| EX-0007-0009 | BR-0007-0009 | `qfai guardrails list --paths /nonexistent`     | エラーメッセージ表示、exit 2                                       |

## EX-0007-0010: Coverage Placeholder for BR-0007-0005

- BR-Ref: BR-0007-0005
- Given the consolidated rule BR-0007-0005
- When layer coverage is evaluated
- Then at least one example exists for BR-0007-0005

## EX-0007-0011: Coverage Placeholder for BR-0007-0010

- BR-Ref: BR-0007-0010
- Given the consolidated rule BR-0007-0010
- When layer coverage is evaluated
- Then at least one example exists for BR-0007-0010
