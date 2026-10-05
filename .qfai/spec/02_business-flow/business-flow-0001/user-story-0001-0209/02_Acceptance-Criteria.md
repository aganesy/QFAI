# Acceptance Criteria

## Criteria

```gherkin
Feature: Run every step of the route
  # AC-0001-0209-01
  Scenario: A route runs every step its plan names
    Given a route whose stage lists its steps in order, some marked pass-through
    When `plan` returns the route
    Then it names every step of the stage, in plan order, with its mode and its pass-through mark
    And no step is left out for the request at hand
```
