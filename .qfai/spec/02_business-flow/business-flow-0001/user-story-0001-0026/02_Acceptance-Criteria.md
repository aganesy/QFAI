# Acceptance Criteria

## Criteria

```gherkin
Feature: レガシーファイル退避

# AC-0001-0026-01
# Parent: US-0001-0026
Scenario: Legacy file removal
  Given `10_workflow.md` exists under `.qfai/assistant/skills/` (`.qfai/assistant/skill/` with the `rule/ skill/ agent/ prompt/` assistant tree)
  When `qfai init --force` runs
  Then `10_workflow.md` is deleted
```
