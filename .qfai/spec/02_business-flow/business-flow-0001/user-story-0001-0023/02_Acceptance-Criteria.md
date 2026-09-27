# Acceptance Criteria

## Criteria

```gherkin
Feature: ドライラン

# AC-0001-0023-01
# Parent: US-0001-0023
Scenario: --dry-run で変更プレビュー
  Given 空のプロジェクトディレクトリが存在する
  When `qfai init --dry-run` を実行する
  Then 作成予定のファイル一覧が表示される
  And 実際にはファイルが作成されない
```
