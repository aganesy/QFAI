# Acceptance Criteria

## Criteria

```gherkin
Feature: Skill-document references and migration notes
  # AC-0001-0046-01
  Scenario: A SKILL.md reference to a retired steering path is reported
    Given a `qfai-*` SKILL.md whose body references one of the retired `.qfai/assistant/steering/` paths `agent-routing.yml`, `agent-catalog.yml`, `review-profiles.yml` or `test-layers.md`
    When `qfai validate` runs
    Then `W-SKILL-DOC-BROKEN-REF` is emitted at error against that SKILL.md, and its message says the reference is past the announced sunset and where that content now lives. User-defined (non-`qfai-*`) skills are NOT flagged.
    And the check matches only that fixed list, so any other `.qfai/assistant/...` reference raises no such finding

  # AC-0001-0046-02
  Scenario: Migration notes pass through as informational
    Given a validate run on a project that just completed `qfai init --upgrade-assistant-tree`
    When the migration emitted `W-USER-EDIT-PRESERVED` informational notes
    Then the validator recognizes those notes as informational pass-throughs (`info` severity, not warning/error); they appear in the validate report under "Informational" without failing any gate
```
