# Acceptance Criteria

## Criteria

```gherkin
Feature: Tool Selection Documentation

# AC-0001-0081-01
# Parent: US-0001-0081
Scenario: Tool Selection Rationale Recorded
  Given the configure workflow
  When tool selection is made per layer
  Then rationale is recorded in the evidence file.

# AC-0001-0081-02
# Parent: US-0001-0081
Scenario: Minimum Runnable Path Documented
  Given the project
  When configuration completes
  Then a minimum runnable path (dev server, DB, env, commands) is documented.
```
