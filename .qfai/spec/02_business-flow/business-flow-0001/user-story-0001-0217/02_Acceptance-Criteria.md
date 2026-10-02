# Acceptance Criteria

## Criteria

```gherkin
Feature: Change the route catalog only with a recorded approval
  # AC-0001-0217-01
  Scenario: Every route row cites the change request that approved it
    Given the route rows of the workflow contract
    When the catalog check runs on a pull request
    Then each row cites a change-request row in force that names the contract and the route
    And a row with no such citation fails the check

  # AC-0001-0217-02
  Scenario: The shipped plans are exactly the catalog
    Given the shipped plans and the route rows
    When the catalog check runs
    Then there is one plan per row and one row per plan
    And each plan states what its row states

  # AC-0001-0217-03
  Scenario: A route change without a new approval fails
    Given a route added, removed or changed in a pull request
    When the catalog check and the drift gate run
    Then the change passes only with a new change-request row that the changed row cites
```
