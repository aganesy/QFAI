# Acceptance Criteria

## Criteria

```gherkin
Feature: 内部バリデーション実行

# AC-0001-0063-01
# Parent: US-0001-0063
Scenario: --run-validate で内部バリデーション実行
  Given スペック構造が存在する（validate.json は不要）
  When `qfai report --run-validate` を実行する
  Then バリデーションが内部実行され、その結果でレポートが生成される
  And validate.json も更新される

# AC-0001-0063-02
# Parent: US-0001-0063
Scenario: A narrow profile in CI is reported, not fatal
  Given a CI environment and a story tree
  When `qfai report --run-validate --profile atdd` runs
  Then the written validate result carries `QFAI-VALIDATE-017` at warning, and the report warns that a full scan is still needed
  And that finding alone does not make the exit code non-zero
```
