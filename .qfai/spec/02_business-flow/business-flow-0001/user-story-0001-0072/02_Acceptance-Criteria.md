# Acceptance Criteria

## Criteria

```gherkin
Feature: Test Case Quality Depth Verification
  # AC-0001-0072-01
  Scenario: Normal-path-only test cases are flagged
    Given the test cases produced by ATDD for a business flow
    When the test-design-analyst reviews them
    Then a BF or AC with only normal-path test cases is flagged as incomplete.
```
