# Acceptance Criteria

## Criteria

```gherkin
Feature: API Acceptance Test Implementation

# AC-0001-0071-01
# Parent: US-0001-0071
Scenario: API Coverage Obligation
  Given required CON-API declarations
  When ATDD API implementer runs
  Then every required CON-API has a corresponding API test file under `tests/api/**` with `QFAI:CON-API-XXXX` annotation and zero TC annotations.
```
