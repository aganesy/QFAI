# Acceptance Criteria

## Criteria

```gherkin
Feature: Prototyping execution plan
  # AC-0001-0099-01
  Scenario: Step 0 execution planning is documented
    Given a prototyping run is being planned
    When the skill prepares execution before the first capture or evaluation cycle
    Then `/qfai-prototyping` documents Step 0 execution planning before the first capture/evaluation cycle.
    And Step 0 names `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`.
    And delegation scope and invalid role handling are documented in the same execution-planning posture.
```
