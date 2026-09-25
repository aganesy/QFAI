# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0101-01
# Parent: US-0001-0101
Scenario: AC-0001-0101-01
  Given a prototyping run approaches completion
  When the skill documents its machine gate
  Then `qfai validate --fail-on error` is documented as the machine gate before completion.

# AC-0001-0101-02
# Parent: US-0001-0101
Scenario: AC-0001-0101-02
  Given a prototyping run approaches final review
  When the skill documents its review gate
  Then `/qfai-verify` is documented as the final review gate.
  And Completion remains blocked on `REVISE`.

# AC-0001-0101-03
# Parent: US-0001-0101
Scenario: Per-spec time-budget soft warning
  Given the per-spec time-budget cap is 5 min/spec per cycle (OQ-0004) (5 min per UI contract per cycle on the story tree),
  When a spec × cycle exceeds the cap,
  Then the Reviewer payload records a `softWarnings.timeBudget` entry; the aggregator does NOT gate on it; only the global 10-cycle budget can hard-fail the run.
```
