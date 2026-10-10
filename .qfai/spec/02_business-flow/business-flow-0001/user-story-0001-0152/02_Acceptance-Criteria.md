# Acceptance Criteria

## Criteria

```gherkin
Feature: Active Design Contract Surface Reduction
  # AC-0001-0152-02
  Scenario: Active Design Contract Index = {DESIGN.md}
    Given the design inputs the shipped `qfai-sdd` and `qfai-prototyping` skills name
    When the active design contracts are listed
    Then the set is root `DESIGN.md` alone, which `common-design-md` authors and validates, and the prototyping handoff is recorded in `.qfai/prototype/final/handoff.json` rather than under `<paths.contractsDir>/design/`
```
