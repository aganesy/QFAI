# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0040-01
# Parent: US-0001-0040
Scenario: AC-0001-0040-01
  Given a declared screen has no screenshot evidence
  When the UI evidence validator runs
  Then `QFAI-UIE-001` fires when a declared screen is missing screenshot evidence.

# AC-0001-0040-02
# Parent: US-0001-0040
Scenario: AC-0001-0040-02
  Given a declared screen has no HTML snapshot evidence
  When the UI evidence validator runs
  Then `QFAI-UIE-002` fires when a declared screen is missing HTML snapshot evidence.

# AC-0001-0040-03
# Parent: US-0001-0040
Scenario: AC-0001-0040-03
  Given no screen contract exists
  When the UI evidence validator runs
  Then the UI evidence validator skips without error.
```
