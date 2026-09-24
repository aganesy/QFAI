# Acceptance Criteria

## Criteria

```gherkin
Feature: Integration Acceptance Test Implementation

# AC-0001-0072-01
# Parent: US-0001-0072
Scenario: Integration Coverage Obligation
  Given required TC declarations in a spec
  When ATDD Integration implementer runs
  Then every required TC has a corresponding Integration test file under `tests/integration/**` with `QFAI:SPEC-XXXX:TC-YYYY` annotation.

Scenario: Integration Coverage Obligation on the story tree
  Given the ACs of the stories in scope
  When the ATDD Integration implementer runs
  Then every AC has a test file under `<testsDir>/integration/**` or `<testsDir>/api/**` carrying `QFAI:AC-NNNN-NNNN-NN`.
```
