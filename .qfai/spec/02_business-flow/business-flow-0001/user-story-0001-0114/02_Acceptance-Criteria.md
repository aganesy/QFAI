# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0114-01
# Parent: US-0001-0114
Scenario: Cycle 0 records the design hash
  Given `qfai prototyping iterate --cycle 0`,
  When it completes,
  Then `prototyping.json#designMd.sha256` is set to `sha256(DESIGN.md bytes)`, the value every later cycle and `certify` compare the live file with.
```
