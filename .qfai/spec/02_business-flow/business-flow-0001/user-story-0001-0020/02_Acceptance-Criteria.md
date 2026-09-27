# Acceptance Criteria

## Criteria

```gherkin
Feature: ワークスペース初期化

# AC-0001-0020-01
# Parent: US-0001-0020
Scenario: Initialization succeeds in an empty directory
  Given an empty project directory
  When `qfai init` runs
  Then `.qfai/assistant/` is created
  And none of `specs/`, `contracts/`, `discussion/`, `evidence/`, `review/` and `report/` exists under `.qfai/`
  And `qfai.config.yaml` is created at the project root
  And where init lays out the story tree, `.qfai/spec/` is created as well
```
