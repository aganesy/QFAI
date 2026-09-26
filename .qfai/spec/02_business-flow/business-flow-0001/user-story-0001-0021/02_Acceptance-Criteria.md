# Acceptance Criteria

## Criteria

```gherkin
Feature: 冪等な初期化

# AC-0001-0021-01
# Parent: US-0001-0021
Scenario: 冪等な初期化 - 既存ファイルスキップ
  Given `.qfai/` ディレクトリが既に存在し、qfai.config.yaml が存在する
  When `qfai init` を再度実行する
  Then 既存ファイルはスキップされ、新規ファイルのみ追加される
  And スキップされたファイルの情報がコンソールに表示される
```
