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
Scenario: --run-validate + --phase refinement の phase guard
  Given CI 環境でスペック構造が存在する
  When `qfai report --run-validate --phase refinement` を実行する
  Then phase guard エラーが表示される
  And exit code 1 で終了する
```
