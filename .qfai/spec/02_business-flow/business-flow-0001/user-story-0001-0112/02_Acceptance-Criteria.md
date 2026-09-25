# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0112-01
# Parent: US-0001-0112
Scenario: CLI iterate exit codes
  Given `qfai prototyping iterate --cycle <n>` runs,
  When the cycle completes,
  Then exit code is `0` for continue or a cycle-0 no-op, `2` for invalid input or frozen-state drift, `64` for convergence or reviewer-session failure, `65` for the ten-cycle budget, or `66` for license verification failure.
  And a recorded reviewer session status distinguishes its exit `64` from convergence.
```
