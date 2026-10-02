# Acceptance Criteria

## Criteria

```gherkin
Feature: non-UI safe skip
  # AC-0001-0018-01
  Scenario: A non-UI pack bypasses the sidecar requirement
    Given a non-UI discussion pack
    When discussion completion is validated
    Then a missing UI sidecar alone raises no error
```
