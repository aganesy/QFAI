# Acceptance Criteria

## Criteria

```gherkin
Feature: 強制更新

# AC-0001-0022-01
# Parent: US-0001-0022
Scenario: --force overwrites the skills
  Given older skill files exist under `.qfai/assistant/skills/` (`.qfai/assistant/skill/` with the `rule/ skill/ agent/ prompt/` assistant tree)
  When `qfai init --force` runs
  Then the skill files under `skills/` are overwritten with the shipped release
  And the files under `skills.local/` are left unchanged
  And with the `rule/ skill/ agent/ prompt/` assistant tree, the same holds for `skill/` and `skill.local/`
```
