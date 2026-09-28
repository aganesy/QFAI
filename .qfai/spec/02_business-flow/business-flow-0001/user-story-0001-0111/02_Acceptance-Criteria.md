# Acceptance Criteria

## Criteria

```gherkin
Feature: Cycle-zero design hash recording
  # AC-0001-0111-01
  Scenario: Cycle 0 records the design hash
    Given `qfai prototyping iterate --cycle 0`,
    When it completes,
    Then `prototyping.json#designMd.sha256` is set to `sha256(DESIGN.md bytes)`, the value every later cycle and `certify` compare the live file with.
```
