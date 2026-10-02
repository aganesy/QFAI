# Acceptance Criteria

## Criteria

```gherkin
Feature: Devils-Advocate Reviewer
  # AC-0001-0164-01
  Scenario: A FAIL verdict carries a concrete alternative
    Given a devils-advocate FAIL verdict
    When checked
    Then it includes a concrete alternative proposal. Bare negation FAIL triggers re-judgment.

  # AC-0001-0164-02
  Scenario: Devils-Advocate Is Advisory
    Given the built-in review profiles
    When the `devils-advocate` optional mode is read
    Then it is advisory and does not block completion by default
    And it requires a concrete alternative on FAIL and treats a bare negation as invalid
```
