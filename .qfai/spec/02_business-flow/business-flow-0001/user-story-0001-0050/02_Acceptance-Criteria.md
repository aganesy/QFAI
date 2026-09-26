# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0050-01
# Parent: US-0001-0050
Scenario: AC-0001-0050-01
  Given a Reviewer-Gate report containing an `R-PROMPT-SCANNER-DRIFT` finding whose `justification:` field is empty, missing, or whitespace-only
  When `qfai validate` ingests the reviewer report
  Then validate rejects the run with severity error (advisory-failing); a finding with a non-empty `justification:` naming (a) the modified file, (b) the un-paired counterpart, and (c) the specific contract clause whose match cannot be confirmed passes
```
