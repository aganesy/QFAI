# Acceptance Criteria

## Criteria

```gherkin
Feature: Evidence Sampling Confirmation
  # AC-0001-0078-01
  Scenario: Evidence Sampling Produces Matches
    Given proposed glob patterns
    When evidence sampling runs
    Then 5-15 actual test files are listed. Zero matches triggers a stop-and-ask.
```
