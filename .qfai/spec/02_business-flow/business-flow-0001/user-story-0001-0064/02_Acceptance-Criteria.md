# Acceptance Criteria

## Criteria

```gherkin
Feature: Per-unit reports
  # AC-0001-0064-01
  Scenario: Per-unit reports
    Given validate.json exists
    When `qfai report` runs
    Then in the spec-pack layout, a report per spec is written in addition to report.md
    And on the story tree, a report per business flow is written under `<outDir>/business-flow-NNNN/` in addition to report.md
    And each contract in a flow's graph is named by the contract ID its file declares
```
