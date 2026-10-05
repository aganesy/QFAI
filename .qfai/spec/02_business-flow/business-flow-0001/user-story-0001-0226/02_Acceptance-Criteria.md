# Acceptance Criteria

## Criteria

```gherkin
Feature: Write the bodies of empty acceptance tests in a quality phase
  # AC-0001-0226-01
  Scenario: The quality-phase route writes the bodies and ends with the gates
    Given a request to write the acceptance tests of a business flow
    When it is planned
    Then its route is `write-acceptance-tests`
    And it ends with the verify gates after one code review

  # AC-0001-0226-02
  Scenario: The annotations stay as they are
    Given acceptance tests with empty bodies and their annotations
    When `implement-acceptance` writes their bodies
    Then each test keeps its annotation and its file, and no annotation is added
```
