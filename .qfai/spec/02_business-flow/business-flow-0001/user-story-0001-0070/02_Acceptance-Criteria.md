# Acceptance Criteria

## Criteria

```gherkin
Feature: E2E Acceptance Test Implementation

# AC-0001-0070-01
# Parent: US-0001-0070
Scenario: E2E Coverage Obligation on the story tree
  Given a BF in scope
  When the ATDD E2E implementer runs
  Then the BF has an E2E test file under `<testsDir>/e2e/**` carrying `QFAI:BF-NNNN`.
```
