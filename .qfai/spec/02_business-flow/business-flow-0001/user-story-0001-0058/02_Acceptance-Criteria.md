# Acceptance Criteria

## Criteria

```gherkin
Feature: Markdown report generation
  # AC-0001-0058-01
  Scenario: A Markdown report is written
    Given `validate.json` exists
    When `qfai report --format md` runs
    Then `report.md` is written under `paths.outDir`
    And it opens with summary counts of the story tree and of the findings
    And it lists each finding under a `## Findings` heading
    And it lists the stories, acceptance criteria, examples and business rules of each business flow under a `## Business flows` heading
```
