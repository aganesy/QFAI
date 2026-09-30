# Acceptance Criteria

## Criteria

```gherkin
Feature: JSON report generation
  # AC-0001-0059-01
  Scenario: A JSON report is written
    Given `validate.json` exists
    When `qfai report --format json` runs
    Then `report.json` is written under `paths.outDir`
    And it holds the structured report data
```
