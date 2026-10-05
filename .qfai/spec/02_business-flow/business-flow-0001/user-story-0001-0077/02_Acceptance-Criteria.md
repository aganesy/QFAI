# Acceptance Criteria

## Criteria

```gherkin
Feature: Policy Population
  # AC-0001-0077-01
  Scenario: Policy Files Evidence-Based
    Given the story-tree templates for objective, initiative, principle and tech
    When /qfai-configure populates them
    Then each fact is derived from repository evidence or marked `TBD` if unverifiable
    And each fact appears in only one of those four files
```
