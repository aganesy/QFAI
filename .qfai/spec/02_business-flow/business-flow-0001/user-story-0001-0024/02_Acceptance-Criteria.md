# Acceptance Criteria

## Criteria

```gherkin
Feature: symlink ベースのスキル統合

# AC-0001-0024-01
# Parent: US-0001-0024
Scenario: symlink-based skill integration
  Given an empty project directory
  When `qfai init` runs
  Then skill directory symlinks are created in `.claude/skills/`, `.github/skills/`, `.codex/skills/` and `.agents/skills/`
  And each symlink resolves through a relative path under `.qfai/assistant/skills/`
  And with the `rule/ skill/ agent/ prompt/` assistant tree, each resolves under `.qfai/assistant/skill/` instead
```
