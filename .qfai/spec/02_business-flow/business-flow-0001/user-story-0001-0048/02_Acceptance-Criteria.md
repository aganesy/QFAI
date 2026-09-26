# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0048-01
# Parent: US-0001-0048
Scenario: AC-0001-0048-01
  Given a `qfai-*` SKILL.md whose body references one of the retired `.qfai/assistant/steering/` paths `agent-routing.yml`, `agent-catalog.yml`, `review-profiles.yml` or `test-layers.md`
  When `qfai validate` runs
  Then `W-SKILL-DOC-BROKEN-REF` is emitted at error against that SKILL.md, and its message says the reference is past the announced sunset and where that content now lives. User-defined (non-`qfai-*`) skills are NOT flagged.
  And the check matches only that fixed list, so any other `.qfai/assistant/...` reference raises no such finding

# AC-0001-0048-02
# Parent: US-0001-0048
Scenario: AC-0001-0048-02
  Given a validate run on a project that just completed `qfai init --upgrade-assistant-tree`
  When the migration emitted `W-USER-EDIT-PRESERVED` informational notes
  Then the validator recognizes those notes as informational pass-throughs (`info` severity, not warning/error); they appear in the validate report under "Informational" without failing any gate
```
