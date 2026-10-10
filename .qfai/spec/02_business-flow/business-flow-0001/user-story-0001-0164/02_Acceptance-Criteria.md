# Acceptance Criteria

## Criteria

```gherkin
Feature: Devils-Advocate Reviewer
  # AC-0001-0164-01
  Scenario: An objection carries a concrete alternative
    Given a devils-advocate objection
    When checked
    Then it includes a concrete alternative proposal. A bare negation is invalid.

  # AC-0001-0164-02
  Scenario: Devils-Advocate Is Advisory
    Given the built-in review profiles
    When the `devils-advocate` optional mode is read
    Then it is advisory and does not block completion by default
    And it requires a concrete alternative with each objection and treats a bare negation as invalid
```
