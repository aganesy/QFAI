# Acceptance Criteria

## Criteria

```gherkin
Feature: Test Case Quality Depth Verification
  # AC-0001-0072-01
  Scenario: Normal-path-only test cases are flagged
    Given the acceptance tests written for a business flow
    When the code review's `implementation-reviewer` reads the annotated tests
    Then a BF or AC with only normal-path test cases, whose obligations make an error, boundary or edge case meaningful, is returned `REVISE` naming the missing case and its owner.
```
