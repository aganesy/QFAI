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
  Given the latest 3 iters each have `informationArchitecture ∈ {weak, acceptable}` and the latest iter has `layoutAntiPatternsDetected.length > 0`,
  When `computePivotDirective(history)` runs,
  Then it returns `"pivot"`.

# AC-0001-0108-03
# Parent: US-0001-0108
Scenario: pivotDirective Rule — continue
  Given the latest iter has `≥ 2` of the 4 UX axes strictly improved by `ordinalIndex` (weak=0, acceptable=1, strong=2, exceptional=3) versus the prior iter,
  When `computePivotDirective(history)` runs,
  Then it returns `"continue"`. Otherwise (and not `pivot`) it returns `"refine"`.
```
