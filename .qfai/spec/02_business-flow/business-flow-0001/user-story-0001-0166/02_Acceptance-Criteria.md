# Acceptance Criteria

## Criteria

```gherkin
Feature: All-Reviewer REVISE Obligation
  # AC-0001-0166-01
  Scenario: All-Reviewer REVISE Obligation
    Given any reviewer returning `REVISE`
    When checked
    Then each blocking finding includes a concrete fix proposal. Feedback without one is invalid.
```
