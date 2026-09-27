# Acceptance Criteria

## Criteria

```gherkin
Feature: Test Case Quality Depth Verification

# AC-0001-0074-01
# Parent: US-0001-0074
Scenario: Normal-path-only test cases are flagged
  Given test cases produced by ATDD
  When the test-design-analyst reviews them
  Then any US/TC with only normal-path test cases is flagged as incomplete.

Scenario: Normal-path-only test cases are flagged on the story tree
  Given the test cases produced by ATDD for a business flow
  When the test-design-analyst reviews them
  Then a BF or AC with only normal-path test cases is flagged as incomplete.
```
