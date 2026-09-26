# Acceptance Criteria

## Criteria

```gherkin
Feature: レガシー警告

# AC-0003-0004-01
# Parent: US-0003-0004
Scenario: レガシー警告
  Given レガシーファイルレイアウトが検出される
  When `qfai doctor` を実行する
  Then レガシー警告が表示される
```
