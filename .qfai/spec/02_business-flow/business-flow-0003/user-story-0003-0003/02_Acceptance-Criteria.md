# Acceptance Criteria

## Criteria

```gherkin
Feature: パス解決診断

# AC-0003-0003-01
# Parent: US-0003-0003
Scenario: パス解決診断
  Given qfai.config.yaml の testsDir が存在しないパスを指している
  When `qfai doctor` を実行する
  Then パス解決失敗が warning として報告される
```
