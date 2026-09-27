# Acceptance Criteria

## Criteria

```gherkin
Feature: Markdown レポート生成

# AC-0001-0060-01
# Parent: US-0001-0060
Scenario: Markdown レポート生成
  Given validate.json が存在する
  When `qfai report --format md` を実行する
  Then paths.outDir 配下に report.md が生成される
  And エグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックスが含まれる
```
