# Acceptance Criteria

## Criteria

```gherkin
Feature: Reference Pool Authoring
  # AC-0001-0081-01
  Scenario: UI-bearing discussion translates references into local direction
    Given a UI-bearing discussion uses component or competitive references
    When the reference registries in `04_Sources.md` are finalized
    Then each registered reference identifies adopted points, rejected points, and their local translation
    And competitive references are framed as material to deviate from, not a template to copy without change
```
