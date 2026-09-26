# Acceptance Criteria

## Criteria

```gherkin
Feature: Steering Population

# AC-0001-0079-01
# Parent: US-0001-0079
Scenario: Steering Files Evidence-Based
  Given the story-tree templates for objective, initiative, principle, tech and structure
  When /qfai-configure populates them
  Then each fact is derived from repository evidence or marked `TBD` if unverifiable
  And each fact appears in only one of those five files
```
