# Acceptance Criteria

## Criteria

```gherkin
Feature: Fix a regression an existing correct test catches, leaving the covered example covered
  # AC-0001-0202-01
  Scenario: A regression fix changes production code only
    Given an existing, correct test annotating an EX of the flow now fails
    When /qfai-implement runs implement-regression-fix
    Then it changes production code only, and no test, story or contract file
    And the EX is still annotated by that test
    And no change request row is appended
```
