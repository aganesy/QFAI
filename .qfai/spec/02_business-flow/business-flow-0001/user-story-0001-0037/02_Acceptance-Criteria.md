# Acceptance Criteria

## Criteria

```gherkin
Feature: legacy layout past its sunset

# AC-0001-0037-01
# Parent: US-0001-0037
Scenario: legacy layout kept, reported as an error
  Given a project that still carries the legacy `.qfai/assistant/steering/` layout
  When `qfai init` runs without a flag at or past the sunset release (v1.10.0)
  Then the legacy files are neither deleted nor changed, and `D-DEPRECATED-PATH` is written to stderr as an error. The error does not stop `qfai init`

# AC-0001-0037-02
# Parent: US-0001-0037
Scenario: D-DEPRECATED-PATH names the sunset and the migration
  Given an init run that detects the legacy layout
  When `D-DEPRECATED-PATH` is reported
  Then its text says the layout is past the announced sunset and names that release as `v1.10.0`, names the migration command `qfai init --upgrade-assistant-tree`, and no longer calls the legacy layout read-compatible
```
