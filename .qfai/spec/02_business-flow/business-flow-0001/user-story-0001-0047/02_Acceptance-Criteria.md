# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0047-01
# Parent: US-0001-0047
Scenario: AC-0001-0047-01
  Given a project still carrying `.qfai/assistant/steering/` after the v1.9.0 release
  When `qfai validate` runs in v1.9.x
  Then `D-DEPRECATED-PATH` warning is emitted with the body string literally containing `sunset: v1.10.0`; in v1.10.0+ the same condition escalates to error per REQ-0008 (handled by spec-0003 sunset semantics + spec-0004 validator severity table)

# AC-0001-0047-02
# Parent: US-0001-0047
Scenario: AC-0001-0047-02
  Given a `qfai-*` skill whose SKILL.md does not end with a `project_memory:` YAML block
  When `qfai validate` runs
  Then `W-SKILL-PROJECT-MEMORY` is emitted at warning, naming the skill and the missing block
  And a trailing `project_memory:` block raises no such warning whatever sub-keys it holds
```
