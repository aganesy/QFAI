# Acceptance Criteria

## Criteria

```gherkin
Feature: Migration notes pass through as informational
  # AC-0001-0046-02
  Scenario: Migration notes pass through as informational
    Given a validate run on a project that just completed `qfai init --upgrade-assistant-tree`
    When the migration emitted `W-USER-EDIT-PRESERVED` informational notes
    Then the validator recognizes those notes as informational pass-throughs (`info` severity, not warning/error); they appear in the validate report under "Informational" without failing any gate
```
