# Acceptance Criteria

## Criteria

```gherkin
Feature: validate.json 入力

# AC-0001-0064-01
# Parent: US-0001-0064
Scenario: validate.json 不在時のエラー
  Given validate.json が存在しない
  When `qfai report` を実行する
  Then "qfai report: input file not found" エラーメッセージが表示される
  And exit code 2 で終了する
```
