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
Scenario: Devils-Advocate Is Advisory
  Given the built-in review profiles
  When the `devils-advocate` optional mode is read
  Then it is advisory and does not block completion by default
  And it requires a concrete alternative on FAIL and treats a bare negation as invalid
```
