# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0141-01
# Parent: US-0001-0141
Scenario: Exit-64 blocking-cause summary
  Given a non-converged cycle,
  When `iterate` emits its cycle-end summary,
  Then stdout MUST contain a one-screen `[BLOCKED]` line naming the top-3 categories (`designMdViolations` / `layoutAntiPatternsDetected` / `blockingFindings`) with concrete counts AND first-offender details (e.g. `color=#fff at iter-NN/scr_001.html:97`, `lap-008-no-back-affordance`, the first line the reviewer wrote).
  And category names MUST be stable identifiers — additive only across versions.
```
