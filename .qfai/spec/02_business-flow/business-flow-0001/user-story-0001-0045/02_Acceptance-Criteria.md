# Acceptance Criteria

## Criteria

```gherkin
Feature: Reviewer finding justification
  # AC-0001-0045-01
  Scenario: An unjustified R-REJECTED-READOPT finding fails validation
    Given a reviewer report containing an `R-REJECTED-READOPT` finding with an empty or missing `justification:` field
    When `qfai validate` ingests the reviewer report
    Then the validator rejects the run with severity error (advisory-failing). A correctly-justified finding (non-empty `justification:` naming the Decisions row) passes
```
