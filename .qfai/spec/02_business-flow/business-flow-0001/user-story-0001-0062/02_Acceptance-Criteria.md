# Acceptance Criteria

## Criteria

```gherkin
Feature: リポジトリリンク付与

# AC-0001-0062-01
# Parent: US-0001-0062
Scenario: --base-url でリポジトリリンク付与
  Given validate.json が存在する
  When `qfai report --format md --base-url https://github.com/org/repo` を実行する
  Then レポート内のファイルパスにリポジトリ URL リンクが付与される
```
