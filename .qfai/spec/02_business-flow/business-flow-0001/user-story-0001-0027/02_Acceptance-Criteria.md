# Acceptance Criteria

## Criteria

```gherkin
Feature: 旧ラッパー prune

# AC-0001-0027-01
# Parent: US-0001-0027
Scenario: 旧ラッパー prune
  Given QFAI-generated wrappers exist under `.claude/commands/`, `.github/prompts/`, or as non-symlink `qfai-*` skill directories
  When `qfai init --force` を実行する
  Then those generated wrappers are pruned without deleting adopter-owned content
```
