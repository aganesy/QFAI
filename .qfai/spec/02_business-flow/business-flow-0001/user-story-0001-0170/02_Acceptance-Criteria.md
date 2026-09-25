# Acceptance Criteria

## Criteria

```gherkin
Feature: Devils-Advocate Reviewer

# AC-0001-0170-01
# Parent: US-0001-0170
Scenario: Optional Review Mode Concrete Alternative
  Given a devils-advocate FAIL verdict
  When checked
  Then it includes a concrete alternative proposal. Bare negation FAIL triggers re-judgment.

# AC-0001-0170-02
# Parent: US-0001-0170
Scenario: Devils-Advocate 3-FAIL Demotion
  Given 3 consecutive devils-advocate FAILs
  When checked
  Then advisory demotion is triggered (blocking power lost for current review cycle).
```
