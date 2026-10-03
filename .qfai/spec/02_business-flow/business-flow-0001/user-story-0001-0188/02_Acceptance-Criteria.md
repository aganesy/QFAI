# Acceptance Criteria

## Criteria

```gherkin
Feature: Stop only for my decision or a fact only I hold
  # AC-0001-0188-05
  Scenario: Only what is unsettled is asked
    Given a route blocked by one missing value
    When the session asks for it
    Then exactly one question is put and the route is planned afterwards
    And no discussion pack is created
```
