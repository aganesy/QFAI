# Acceptance Criteria

## Criteria

```gherkin
Feature: A REVISE code review blocks completion
  # AC-0001-0157-01
  Scenario: A REVISE code review blocks completion
    Given the code review of a route
    When it returns `REVISE`
    Then the route does not complete until every finding of that review is fixed or answered
    And a fix that changes behaviour gets one re-review of its own diff by the same reviewer, whose findings are fixed or answered with no further re-review
    And a fix that changes wording only gets no re-review
```
