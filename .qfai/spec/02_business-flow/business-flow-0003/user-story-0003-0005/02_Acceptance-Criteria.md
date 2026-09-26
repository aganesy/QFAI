# Acceptance Criteria

## Criteria

```gherkin
Feature: JSON 診断出力

# AC-0003-0005-01
# Parent: US-0003-0005
Scenario: JSON 出力
  Given qfai.config.yaml が存在する
  When `qfai doctor --format json` を実行する
  Then JSON 形式で root, config, checks, summary が出力される

# AC-0003-0005-02
# Parent: US-0003-0005
Scenario: --out ファイル出力
  Given doctor チェックが完了する
  When `qfai doctor --format json --out /tmp/doctor.json` を実行する
  Then /tmp/doctor.json に診断結果が出力される
```
