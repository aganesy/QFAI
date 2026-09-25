# Acceptance Criteria

## Criteria

```gherkin
Feature: Skill オーケストレーション設計契約

# AC-0001-0003-01
# Parent: US-0001-0003
Scenario: Skill 依存関係が DAG で定義されている
  Given Skill 依存関係を参照する
  When 依存グラフを確認する
  Then configure -.-> discussion(optional) → sdd → prototyping(optional) → atdd → implement → verify の順序が定義されている
  And 循環依存が存在しない
```
