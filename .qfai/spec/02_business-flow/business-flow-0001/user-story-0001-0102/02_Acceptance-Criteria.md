# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0102-01
# Parent: US-0001-0102
Scenario: AC-0001-0102-01
  Given a prototyping run is being planned
  When the skill prepares execution before the first capture or evaluation cycle
  Then `/qfai-prototyping` documents Step 0 execution planning before the first capture/evaluation cycle.
  And Step 0 names `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`.
  And Delegation scope and invalid role handling are documented in the same execution-planning posture.
```
