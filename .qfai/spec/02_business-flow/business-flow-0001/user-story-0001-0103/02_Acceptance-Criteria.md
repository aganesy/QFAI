# Acceptance Criteria

## Criteria

```gherkin
Feature: Shared screenshot capture guidance
  # AC-0001-0103-01
  Scenario: Canonical evidence paths are documented
    Given declared screens require evidence
    When the evidence paths are documented
    Then declared screen evidence uses the canonical screenshot and HTML snapshot paths.
    And the documentation names the canonical paths explicitly.
```
