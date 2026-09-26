# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0124-01
# Parent: US-0001-0124
Scenario: Certify aggregates per-spec presence
  Given `qfai prototyping certify --check`,
  When run after the loop terminates,
  Then certify iterates the cycle-0 frozen spec set via `readFrozenSpecsCovered()`, asserts that every declared screen of every covered spec has a `<screen>.review.json` at the accepted iter, and exits 0 on full coverage / non-zero with a diagnostic naming the missing `(spec, screen)` pair on any miss.
  And On the story tree certify iterates the cycle-0 frozen `uiContractsCovered[]`, and the diagnostic names the missing `(UI contract, screen)` pair.
```
