# Acceptance Criteria

## Criteria

```gherkin
Feature: Legacy file removal
  # AC-0001-0026-01
  Scenario: Legacy file removal
    Given `10_workflow.md` exists under `.qfai/assistant/skills/` (`.qfai/assistant/skill/` with the `rule/ skill/ agent/ prompt/` assistant tree)
    When `qfai init --force` runs
    Then `10_workflow.md` is deleted
```
