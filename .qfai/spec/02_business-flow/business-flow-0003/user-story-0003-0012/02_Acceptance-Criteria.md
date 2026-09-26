# Acceptance Criteria

## Criteria

```gherkin
Feature: Doctor failure threshold

# AC-0003-0012-01
# Parent: US-0003-0012
Scenario: --fail-on error で warning は pass
  Given doctor チェックで warning のみ検出される
  When `qfai doctor --fail-on error` を実行する
  Then 終了コード 0 で終了する

# AC-0003-0012-02
# Parent: US-0003-0012
Scenario: --fail-on warning で warning は fail
  Given doctor チェックで warning が検出される
  When `qfai doctor --fail-on warning` を実行する
  Then 終了コード 1 で終了する
```
