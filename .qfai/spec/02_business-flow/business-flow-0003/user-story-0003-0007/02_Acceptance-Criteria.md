# Acceptance Criteria

## Criteria

```gherkin
Feature: doctor 出力 group 分け + skills.integrity downgrade

# AC-0003-0007-01
# Parent: US-0003-0007
Scenario: skills.integrity defaults to warning
  Given skills.integrity check が drift を検出する状態
  When `qfai doctor` を実行する
  Then finding severity は `warning` (既定値)
  And `--fail-on error` でも exit 0 が維持される (skills.integrity 単独では active profile を block しない)
  And with `--fail-on warning`, `skills.integrity` drift alone ends with exit 1

# AC-0003-0007-02
# Parent: US-0003-0007
Scenario: doctor summary は 2 group に分割表示
  Given doctor が errors と warnings を混在で出力する状態
  When `qfai doctor --format text` を実行する
  Then summary に "errors blocking the active profile" group と "warnings advisory of drift" group が個別に出力される
  And skills.integrity finding は wording にかかわらず "warnings advisory of drift" group に表示される
```
