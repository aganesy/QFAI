# Acceptance Criteria

## Criteria

```gherkin
Feature: Screen Contracts

# AC-0001-0087-01
# Parent: US-0001-0087
Scenario: AC-0001-0087-01
  Given a UI-bearing discussion pack
  When sidecar generation completes
  Then `uiux/40_screen_contracts.md` exists and records screen-level contracts.
```
