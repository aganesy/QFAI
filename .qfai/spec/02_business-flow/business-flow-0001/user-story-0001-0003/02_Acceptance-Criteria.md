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

# AC-0001-0003-02
# Parent: US-0001-0003
Scenario: The skill order holds within every built-in plan
  Given the skill order and the built-in route plans
  When each plan's stages are read against the order
  Then within each plan the stages of `qfai-discussion`, `qfai-sdd`, `qfai-prototyping`, `qfai-atdd` and `qfai-verify` run in that order
  And the plan places each `qfai-implement` and `qfai-maintain` stage
  And `qfai-run` sits above the order, and no plan names it
```
