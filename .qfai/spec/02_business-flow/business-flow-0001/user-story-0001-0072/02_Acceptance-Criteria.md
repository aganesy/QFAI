# Acceptance Criteria

## Criteria

```gherkin
Feature: Test Case Quality Depth Verification
  # AC-0001-0072-01
  Scenario: Normal-path-only test cases are flagged
    Given the acceptance tests written for a business flow
    When `requirements-reviewer` reviews the examples and `implementation-reviewer` the tests
    Then a BF or AC with only normal-path test cases is flagged as incomplete.
```
