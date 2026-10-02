# Acceptance Criteria

## Criteria

```gherkin
Feature: ATDD Test Volume Estimation
  # AC-0001-0067-01
  Scenario: The volume estimate counts flows and criteria in scope
    Given the business flows and stories in scope
    When the TestVolumeEstimator runs
    Then the E2E raw count is the number of BFs in scope and the Integration/API raw count is the number of ACs in scope.
    And volume floors and ratios remain planning signals; completion depends on covering every in-scope BF and AC.
```
