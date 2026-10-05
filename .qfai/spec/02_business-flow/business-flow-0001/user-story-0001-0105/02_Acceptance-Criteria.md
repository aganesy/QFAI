# Acceptance Criteria

## Criteria

```gherkin
Feature: Explicit reviewer pivot directive
  # AC-0001-0105-02
  Scenario: pivotDirective Rule — pivot
    Given `open(r)` is the number of `blockingFindings` plus `layoutAntiPatternsDetected` in review `r`, and `open(latest) > 0`, `open(latest) >= open(prior)` and `open(prior) >= open(prior2)`
    When the reviewer writes `pivotDirective` by the rule the shipped reviewer prompt states
    Then it writes `"pivot"`.

  # AC-0001-0105-03
  Scenario: pivotDirective Rule — continue or refine
    Given the pivot condition does not hold
    When the reviewer writes `pivotDirective` by the rule the shipped reviewer prompt states
    Then it writes `"continue"` when a prior review exists and `open(latest) < open(prior)`, and `"refine"` otherwise.
    And each of the four UX axis scores in the review is one of `weak`, `acceptable`, `strong` or `exceptional`; any other value is rejected.
```
