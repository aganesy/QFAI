# Acceptance Criteria

## Criteria

```gherkin
Feature: 設定ファイル診断

# AC-0003-0001-01
# Parent: US-0003-0001
Scenario: 設定ファイル存在チェック
  Given qfai.config.yaml が存在する
  When `qfai doctor` を実行する
  Then config.found = true として報告される
  And 設定ファイルパスが表示される

# AC-0003-0001-02
# Parent: US-0003-0001
Scenario: 設定ファイル不在チェック
  Given qfai.config.yaml が存在しない
  When `qfai doctor` を実行する
  Then config.found = false として報告される
  And 警告メッセージが表示される
```
