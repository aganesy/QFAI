# Acceptance Criteria

## Criteria

```gherkin
Feature: instructions の force 更新

# AC-0001-0031-01
# Parent: US-0001-0031
Scenario: --force で instructions が更新される
  Given 両方の instructions ファイルがカスタム内容で存在する
  When `qfai init --force` を実行する
  Then どちらのファイルも shipped テンプレートの内容で再生成される
```
