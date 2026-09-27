# Acceptance Criteria

## Criteria

```gherkin
Feature: Exploration Brief Authoring
  # AC-0001-0082-01
  Scenario: UI-bearing discussion records exploration inputs
    Given a UI-bearing discussion pack is ready for downstream prototyping
    When its `04_Sources.md` is finalized
    Then it records the product intent, must-keep interactions, brand signals, and differentiation targets as explicit exploration constraints
    And it does not select a winning visual direction or finalize a design system
```
