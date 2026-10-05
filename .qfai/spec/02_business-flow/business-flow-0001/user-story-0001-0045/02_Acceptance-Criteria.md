# Acceptance Criteria

## Criteria

```gherkin
Feature: Deprecated assistant paths and skill project memory
  # AC-0001-0045-01
  Scenario: The legacy instructions layout raises D-DEPRECATED-PATH naming the sunset
    Given a project still carrying `.qfai/assistant/instructions/` after the v1.9.0 release
    When `qfai validate` runs in v1.9.x
    Then `D-DEPRECATED-PATH` warning is emitted with the body string literally containing `sunset: v1.10.0`; in v1.10.0+ the same condition escalates to error per REQ-0008 (handled by spec-0003 sunset semantics + spec-0004 validator severity table)

  # AC-0001-0045-02
  Scenario: A project_memory block that is not trailing raises a warning
    Given a `qfai-*` skill whose SKILL.md declares a `project_memory:` YAML block followed by other content
    When `qfai validate` runs
    Then `W-SKILL-PROJECT-MEMORY` is emitted at warning, naming the skill and the block
    And a trailing `project_memory:` block raises no such warning whatever sub-keys it holds
```
