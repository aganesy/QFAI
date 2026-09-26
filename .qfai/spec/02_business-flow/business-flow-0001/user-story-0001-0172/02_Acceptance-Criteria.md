# Acceptance Criteria

## Criteria

```gherkin
Feature: All-Reviewer FAIL Obligation

# AC-0001-0172-01
# Parent: US-0001-0172
Scenario: All-Reviewer FAIL Obligation
  Given any reviewer returning FAIL
  When checked
  Then feedback includes a concrete alternative or fix proposal. Feedback without alternative is invalid.
```
