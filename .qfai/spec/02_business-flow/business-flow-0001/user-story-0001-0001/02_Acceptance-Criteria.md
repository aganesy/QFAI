# Acceptance Criteria

## Criteria

```gherkin
Feature: Traceability chain definition
  # AC-0001-0001-01
  Scenario: The four stages of the traceability chain are defined
    Given the QFAI framework specification
    When the traceability chain is read
    Then the four stages specs → tests → code → verification are defined
    And the outputs of each stage are stated
    And the discussion stage comes before the chain
```
