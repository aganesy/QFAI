# Acceptance Criteria

## Criteria

```gherkin
Feature: Forced update
  # AC-0001-0022-01
  Scenario: --force overwrites the skills
    Given older skill files exist under `.qfai/assistant/skill/`
    When `qfai init --force` runs
    Then the skill files under `skill/` are overwritten with the shipped release
    And the files under `skill.local/` are left unchanged
```
