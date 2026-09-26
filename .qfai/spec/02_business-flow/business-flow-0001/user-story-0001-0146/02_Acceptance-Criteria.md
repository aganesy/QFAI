# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0146-01
# Parent: US-0001-0146
Scenario: `--cycle N` out-of-range error clarity (SHOULD)
  Given `iterate --cycle N` invoked with N outside `0..9`,
  When iterate validates the argument,
  Then the error MUST read literally `--cycle accepts 0..9 (=10 cycles total). --cycle 10 would be the 11th cycle and is not supported.` and SHOULD recommend `--cycle 9 --check-convergence` or the equivalent peek mode.
```
