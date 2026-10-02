# Acceptance Criteria

## Criteria

```gherkin
Feature: planner-first design authoring
  # AC-0001-0016-01
  Scenario: Discussion selects no visual winner
    Given a UI-bearing discussion pack
    When the discussion artifacts are inspected
    Then discussion records the user's brand theme in `01_Context.md#Design Direction`
    And screen explorations remain unranked without a selected winner or finalized design system
```
