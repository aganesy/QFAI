# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0114-01
# Parent: US-0001-0114
Scenario: Cycle 0 Records designMdSha256
  Given `qfai prototyping iterate --cycle 0`,
  When it completes,
  Then `prototyping.json#designMdSha256` is set to `sha256(DESIGN.md bytes)` and matches `<paths.contractsDir>/design/DESIGN.md.lock.yaml#sha256` exactly.
```
