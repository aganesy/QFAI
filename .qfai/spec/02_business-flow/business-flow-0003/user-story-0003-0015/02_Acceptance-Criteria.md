# Acceptance Criteria

## Criteria

```gherkin
Feature: ガードレール整合性チェック

# AC-0003-0015-01
# Parent: US-0003-0015
Scenario: ガードレール整合性チェック正常
  Given ガードレールに違反がない
  When `qfai guardrails check` を実行する
  Then error=0 warning=0 で終了コード 0 が返される

# AC-0003-0015-02
# Parent: US-0003-0015
Scenario: ガードレール整合性チェック違反検出
  Given ガードレールに違反がある
  When `qfai guardrails check` を実行する
  Then 違反が Issue 形式（code, message, file, severity）で出力され、終了コード 1 が返される
```
