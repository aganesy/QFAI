# Acceptance Criteria

## Criteria

```gherkin
Feature: Read-only convergence peek

# AC-0001-0191-01
# Parent: US-0001-0191
Scenario: `iterate --check-convergence` reports the recorded loop state read-only
  Given a prototyping evidence tree whose `prototyping.json` records a loop state
  When `qfai prototyping iterate --check-convergence` runs, with or without `--cycle`
  Then it prints `stopReason`, `acceptedIterationIndex` and the number of recorded iterations, and exits 0 only when `stopReason` is `converged` and `acceptedIterationIndex` is a non-negative integer
  And every other state, including a missing or unreadable `prototyping.json`, exits 2 and prints the reason
  And the run writes nothing and does not start a cycle
```
