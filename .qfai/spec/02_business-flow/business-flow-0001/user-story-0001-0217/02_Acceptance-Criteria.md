# Acceptance Criteria

## Criteria

```gherkin
Feature: Keep the route catalog and the shipped plans together
  # AC-0001-0217-02
  Scenario: The shipped plans are exactly the catalog
    Given the shipped plans and the route rows
    When the catalog check runs
    Then there is one plan per row and one row per plan
    And each plan states what its row states
```
