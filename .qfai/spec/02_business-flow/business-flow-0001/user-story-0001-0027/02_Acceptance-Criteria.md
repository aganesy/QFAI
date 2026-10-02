# Acceptance Criteria

## Criteria

```gherkin
Feature: Prune legacy wrappers
  # AC-0001-0027-01
  Scenario: Generated wrappers are pruned on --force
    Given QFAI-generated wrappers exist under `.claude/commands/`, `.github/prompts/`, or as non-symlink `qfai-*` skill directories
    When `qfai init --force` runs
    Then those generated wrappers are pruned without deleting adopter-owned content
```
