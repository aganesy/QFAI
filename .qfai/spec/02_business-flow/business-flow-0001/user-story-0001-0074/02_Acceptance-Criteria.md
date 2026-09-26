# Acceptance Criteria

## Criteria

```gherkin
Feature: Test Case Quality Depth Verification

# AC-0001-0074-01
# Parent: US-0001-0074
Scenario: Coverage Depth Matrix Verification
  Given test cases produced by ATDD
  When the test-design-analyst reviews them
  Then a Coverage Depth Matrix is produced for each spec showing normal/error/boundary/special/state-transition/combinatorial coverage per US/TC, and any US/TC with only normal-path test cases is flagged as incomplete.

Scenario: Coverage Depth Matrix Verification on the story tree
  Given the test cases produced by ATDD for a business flow
  When the test-design-analyst reviews them
  Then the matrix shows coverage per BF and AC, and a BF or AC with only normal-path test cases is flagged as incomplete. One matrix and one ATDD evidence file are produced for each business flow instead of each spec, and the matrix rows are keyed by the flow's US, AC and EX IDs.
```
