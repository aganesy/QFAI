# Acceptance Criteria

## Criteria

```gherkin
Feature: instructions アクティベーション案内

# AC-0001-0032-01
# Parent: US-0001-0032
Scenario: instructions 作成時のアクティベーション案内
  Given 新規リポジトリで instructions ファイルが存在しない
  When `qfai init` を実行する
  And 少なくとも1つの instructions ファイルが作成される
  Then stdout にアクティベーションガイダンスが表示される
```
