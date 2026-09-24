# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0045-01
# Parent: US-0001-0045
Scenario: AC-0001-0045-01
  Given a reviewer report containing an `R-WORKLOG-DRIFT` or `R-REJECTED-READOPT` finding with an empty or missing `justification:` field
  When `qfai validate` ingests the reviewer report
  Then the validator rejects the run with severity error (advisory-failing). A correctly-justified finding (non-empty `justification:` naming the entry ID or Decisions row) passes

# AC-0001-0045-02
# Parent: US-0001-0045
Scenario: AC-0001-0045-02
  Given a work-log entry with `kind: handoff` whose body is missing at least one of the 5 required sections (`## State of the task`, `## Next single action`, `## Constraints to preserve`, `## Open questions`, `## References to consult first` — canonical per `.qfai/contracts/cli/worklog-entry.schema.md`)
  When `qfai validate` runs
  Then `R-HANDOFF-INCOMPLETE` is emitted at error severity; the finding text names the missing section(s) and the entry file
```
