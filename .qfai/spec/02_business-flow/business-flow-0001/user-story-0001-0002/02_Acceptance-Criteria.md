# Acceptance Criteria

## Criteria

```gherkin
Feature: Drift protocol
  # AC-0001-0002-02
  Scenario: A downstream stage routes an upstream defect to its owner
    Given the shipped `drift-protocol.md`
    When its core rule and allowed exceptions are read
    Then every exception it listed before is still listed
    And it states that a downstream skill does not edit an approved upstream artifact on its own authority but returns it to its owner
```
