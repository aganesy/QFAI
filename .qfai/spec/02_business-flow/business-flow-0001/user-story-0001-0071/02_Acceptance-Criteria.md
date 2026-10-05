# Acceptance Criteria

## Criteria

```gherkin
Feature: Undeclared test annotations are errors
  # AC-0001-0071-05
  Scenario: Undeclared ATDD annotation is an error
    Given a test annotation names a BF, AC, or EX ID absent from the story tree
    When `qfai validate` scans the configured test files
    Then it reports an error naming the undeclared ID and the file
    And an annotation naming a defined ID raises no undeclared-reference finding.
```
