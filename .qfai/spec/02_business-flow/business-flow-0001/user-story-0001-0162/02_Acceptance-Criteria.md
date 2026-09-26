# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0162-01
# Parent: US-0001-0162
Scenario: AC-0001-0162-01
  Given /qfai-verify is invoked
  When validation scope is selected
  Then `/qfai-verify` runs full-scan validation rather than a diff-only shortcut.

# AC-0001-0162-02
# Parent: US-0001-0162
Scenario: Verify remains blocked by a validation error
  Given `/qfai-verify` runs full-scan validation through the canonical validator
  When validation reports an error
  Then Verify remains non-pass and surfaces the validation error.

# AC-0001-0162-03
# Parent: US-0001-0162
Scenario: AC-0001-0162-03
  Given the validate command is loaded
  When its public entrypoint is inspected
  Then Validate imports and uses the canonical validator entrypoint.
  And Removed compatibility surfaces are not present in the package surface.
```
