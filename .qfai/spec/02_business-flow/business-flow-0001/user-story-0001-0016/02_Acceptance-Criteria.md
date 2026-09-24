# Acceptance Criteria

## Criteria

```gherkin
Feature: planner-first design authoring

# AC-0001-0016-01
# Parent: US-0001-0016
Scenario: discussion は visual winner を選ばない
  Given UI-bearing discussion pack
  When discussion artifacts を検査する
  Then discussion records the user's brand theme in `01_Context.md#Design Direction`
  And screen explorations remain unranked without a selected winner or finalized design system
```
