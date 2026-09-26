# Acceptance Criteria

## Criteria

```gherkin
Feature: JSON レポート生成

# AC-0001-0061-01
# Parent: US-0001-0061
Scenario: JSON レポート生成
  Given validate.json が存在する
  When `qfai report --format json` を実行する
  Then paths.outDir 配下に report.json が生成される
  And 構造化レポートデータが含まれる
```
