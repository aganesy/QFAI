# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0039-01
# Parent: US-0001-0039
Scenario: AC-0001-0039-01
  Given a QFAI project
  When `qfai validate` runs
  Then `qfai validate` runs deterministic validators and aggregates issues.
```
