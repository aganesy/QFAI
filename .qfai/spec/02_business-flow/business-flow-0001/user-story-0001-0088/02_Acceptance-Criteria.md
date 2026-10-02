# Acceptance Criteria

## Criteria

```gherkin
Feature: Legacy Sidecar Drop
  # AC-0001-0088-01
  Scenario: Legacy sidecars are not emitted
    Given a fresh `/qfai-discussion` UI-bearing run
    When the produced sidecars are listed
    Then `33_exploration_rubric.md`, `34_evaluator_calibration.md`, `30_exploration_brief.md`, `31_reference_pool.md` and `32_design_anti_goals.md` are not created
    And producing any of them is a regression that the skill validator reports
```
