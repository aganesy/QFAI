# Acceptance Criteria

## Criteria

```gherkin
Feature: Canonical production validators
  # AC-0001-0041-01
  Scenario: The canonical UIX validators stay the production path
    Given the canonical UIX validator set
    When production validation runs
    Then the canonical UIX validator set remains the production path.
    And prototyping evidence is validated for each declared screen ID in its UI contract.
```
