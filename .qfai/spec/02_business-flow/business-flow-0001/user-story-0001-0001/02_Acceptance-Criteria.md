# Acceptance Criteria

## Criteria

```gherkin
Feature: トレーサビリティ連鎖定義

# AC-0001-0001-01
# Parent: US-0001-0001
Scenario: トレーサビリティ連鎖の 5 段が定義されている
  Given QFAI フレームワークの仕様を参照する
  When トレーサビリティ連鎖を確認する
  Then discussion → specs → tests → code → verification の 5 段が定義されている
  And 各段の成果物が明記されている
```
