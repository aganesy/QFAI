# Acceptance Criteria

## Criteria

```gherkin
Feature: ガードレール入力エラー

# AC-0003-0016-01
# Parent: US-0003-0016
Scenario: action 未指定エラー
  Given action が指定されていない
  When `qfai guardrails` を実行する
  Then "action is required (list|extract|check)" エラーが表示され、終了コード 2 が返される

# AC-0003-0016-02
# Parent: US-0003-0016
Scenario: パス読み込みエラー
  Given --path に存在しないパスが指定される
  When `qfai guardrails list --path /nonexistent` を実行する
  Then エラーメッセージが表示され、終了コード 2 が返される
```
