# Acceptance Criteria

## Criteria

```gherkin
Feature: Pass a step with evidence when it has nothing to write
  # AC-0001-0216-01
  Scenario: A pass-through step runs and records why it wrote nothing
    Given a work order that marks a step pass-through
    When the step finds nothing to write
    Then its result records a pass with the reason and a record of what it read
    And the step stays in the work order and the result, reviewed like any other

  # AC-0001-0216-02
  Scenario: Only the listed steps may pass
    Given a result that records a pass for a step its work order does not mark pass-through
    When `accept` checks it
    Then it is refused

  # AC-0001-0216-03
  Scenario: A pass is refused while the step's obligation remains
    Given a pass for a step whose obligation check shows work left
    When `accept` checks it
    Then it is refused and the run is unchanged

  # AC-0001-0216-04
  Scenario: Each pass-through step states when it passes
    Given the `STEP.md` of a step on the pass-through list
    When an agent reads it
    Then it states what the step reads first and what shows it has nothing to write
```
