# Acceptance Criteria

## Criteria

```gherkin
Feature: A REVISE code review blocks completion
  # AC-0001-0157-01
  Scenario: A REVISE code review blocks completion
    Given the code review of a route
    When it returns `REVISE`
    Then the route does not complete
```
