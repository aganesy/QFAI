# Acceptance Criteria

## Criteria

```gherkin
Feature: Canonical verification validators
  # AC-0001-0156-01
  Scenario: Verify runs full-scan validation
    Given /qfai-verify is invoked
    When validation scope is selected
    Then `/qfai-verify` runs full-scan validation rather than a diff-only shortcut.

  # AC-0001-0156-02
  Scenario: Verify remains blocked by a validation error
    Given `/qfai-verify` runs full-scan validation through the canonical validator
    When validation reports an error
    Then Verify remains non-pass and surfaces the validation error.

  # AC-0001-0156-03
  Scenario: Validate uses the canonical validator entrypoint
    Given the validate command is loaded
    When its public entrypoint is inspected
    Then Validate imports and uses the canonical validator entrypoint.
    And removed compatibility surfaces are not present in the package surface.
```
