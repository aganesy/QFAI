# Acceptance Criteria

## Criteria

```gherkin
Feature: Symlink-based skill integration
  # AC-0001-0024-01
  Scenario: symlink-based skill integration
    Given an empty project directory
    When `qfai init` runs
    Then skill directory symlinks are created in `.claude/skills/`, `.github/skills/`, `.codex/skills/` and `.agents/skills/`
    And each symlink resolves through a relative path under `.qfai/assistant/skill/`
```
