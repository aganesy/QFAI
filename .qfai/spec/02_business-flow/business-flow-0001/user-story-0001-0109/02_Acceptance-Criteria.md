# Acceptance Criteria

## Criteria

```gherkin
Feature: Accept the latest convergence iteration

# AC-0001-0109-01
# Parent: US-0001-0109
Scenario: Convergence accepts the latest iteration
  Given a convergence-mode run has recorded iterations with indices 0 through 6
  And an earlier iteration has a higher ordinal score than iteration 6
  When the run records its accepted iteration
  Then acceptedIterationIndex is 6
  And no best-of-history selection replaces the latest convergence iteration
```
