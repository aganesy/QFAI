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

  # AC-0001-0022-02
  Scenario: A forced template copy refuses a special file
    Given a FIFO, socket or device occupies a shipped template file destination that the forced copy would write
    When `qfai init --force` runs or `qfai init --force --dry-run` previews the copy
    Then the destination is reported as refused
    And the existing entry is left in place
```
