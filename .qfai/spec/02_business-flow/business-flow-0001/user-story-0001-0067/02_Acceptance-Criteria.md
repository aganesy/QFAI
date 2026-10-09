# Acceptance Criteria

## Criteria

```gherkin
Feature: ATDD Test Volume Follows Scope
  # AC-0001-0067-01
  Scenario: The test skeletons count the flows and criteria in scope
    Given the business flows and stories in scope
    When `qfai atdd scaffold` runs for each flow and each story
    Then it writes one E2E test skeleton for each BF in scope and one integration or API test skeleton for each AC in scope.
    And volume floors and ratios remain planning signals; completion depends on covering every in-scope BF and AC.
```
