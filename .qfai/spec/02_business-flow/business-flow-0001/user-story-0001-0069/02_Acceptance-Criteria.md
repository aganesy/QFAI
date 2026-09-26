# Acceptance Criteria

## Criteria

```gherkin
Feature: ATDD Test Volume Estimation

# AC-0001-0069-01
# Parent: US-0001-0069
Scenario: Volume Estimate Table
  Given a spec with US/TC/CON-API declarations
  When the TestVolumeEstimator runs
  Then a signal table with Raw count, Signal, Evidence, and Notes columns is produced for E2E/API/Integration layers.

Scenario: Volume Estimate Table on the story tree
  Given the business flows and stories in scope
  When the TestVolumeEstimator runs
  Then the E2E raw count is the number of BFs in scope and the Integration/API raw count is the number of ACs in scope.
  And volume floors and ratios remain planning signals; completion depends on covering every in-scope BF and AC.
```
