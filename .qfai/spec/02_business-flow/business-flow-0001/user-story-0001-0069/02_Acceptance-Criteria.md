# Acceptance Criteria

## Criteria

```gherkin
Feature: API Acceptance Test Implementation
  # AC-0001-0069-01
  Scenario: API Coverage Obligation on the story tree
    Given an AC in scope that is exercised through the API
    When the ATDD API implementer runs
    Then a test file under `<testsDir>/api/**` carries `QFAI:AC-NNNN-NNNN-NN` for that AC.
```
