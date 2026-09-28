# Acceptance Criteria

## Criteria

```gherkin
Feature: Markdown report generation
  # AC-0001-0060-01
  Scenario: A Markdown report is written
    Given `validate.json` exists
    When `qfai report --format md` runs
    Then `report.md` is written under `paths.outDir`
    And it holds an executive summary, an issue list and a traceability matrix
```
