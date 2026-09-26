# Acceptance Criteria

## Criteria

```gherkin
Feature: 出力パス制御

# AC-0001-0065-01
# Parent: US-0001-0065
Scenario: --out で出力先制御
  Given validate.json が存在する
  When `qfai report --out /tmp/custom-report.md` を実行する
  Then /tmp/custom-report.md にレポートが出力される
```
