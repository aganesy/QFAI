# Acceptance Criteria

## Criteria

```gherkin
Feature: Skill project memory
  # AC-0001-0045-02
  Scenario: A project_memory block that is not trailing raises a warning
    Given a `qfai-*` skill whose SKILL.md declares a `project_memory:` YAML block followed by other content
    When `qfai validate` runs
    Then `QFAI-SKILLDOC-001` is emitted at warning, naming the skill and the block
    And a trailing `project_memory:` block raises no such warning whatever sub-keys it holds
```
