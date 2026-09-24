# Acceptance Criteria

## Criteria

```gherkin
Feature: planner-first design authoring

# AC-0001-0016-01
# Parent: US-0001-0016
Scenario: discussion は visual winner を選ばない
  Given UI-bearing discussion pack
  When discussion artifacts を検査する
  Then selected direction や finalized design system を discussion の完了条件として要求しない
```
