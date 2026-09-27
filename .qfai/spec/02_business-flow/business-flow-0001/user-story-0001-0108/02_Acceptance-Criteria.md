# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0108-01
# Parent: US-0001-0108
Scenario: pivotDirective Enum
  Given any `iter-NN/review.json`,
  When validated,
  Then `pivotDirective` is exactly one of `"continue" | "refine" | "pivot"`. Other values raise `QFAI-PROT-002`.

# AC-0001-0108-02
# Parent: US-0001-0108
Scenario: pivotDirective Rule — pivot
  Given `open(r)` is the number of `blockingFindings` plus `layoutAntiPatternsDetected` in review `r`, and `open(latest) > 0`, `open(latest) >= open(prior)` and `open(prior) >= open(prior2)`,
  When the reviewer writes `pivotDirective` by the rule the shipped reviewer prompt states,
  Then it writes `"pivot"`.

# AC-0001-0108-03
# Parent: US-0001-0108
Scenario: pivotDirective Rule — continue or refine
  Given the pivot condition does not hold,
  When the reviewer writes `pivotDirective` by the rule the shipped reviewer prompt states,
  Then it writes `"continue"` when a prior review exists and `open(latest) < open(prior)`, and `"refine"` otherwise.
  And each of the four UX axis scores in the review is one of `weak`, `acceptable`, `strong` or `exceptional`; any other value is rejected.
```
