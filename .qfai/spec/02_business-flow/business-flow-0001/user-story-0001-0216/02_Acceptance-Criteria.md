# Acceptance Criteria

## Criteria

```gherkin
Feature: Pass a step that has nothing to write
  # AC-0001-0216-01
  Scenario: A pass-through step runs and states why it wrote nothing
    Given a plan that marks a step pass-through
    When the step finds nothing to write
    Then it still runs, writes nothing and states why
    And the route's review reads that statement

  # AC-0001-0216-04
  Scenario: Each pass-through step states when it passes
    Given the `STEP.md` of a step on the pass-through list
    When an agent reads it
    Then it states what the step reads first and what shows it has nothing to write
```
